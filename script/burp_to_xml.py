#!/usr/bin/env python3
import argparse
import base64
import gzip
import io
import os
import re
import sqlite3
import tempfile
import zipfile
from typing import Dict, Iterable, Iterator, List, Optional, Tuple
from urllib.parse import urlparse
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

SQLITE_MAGIC = b"SQLite format 3\0"
GZIP_MAGIC = b"\x1f\x8b"
ZIP_MAGIC = b"PK\x03\x04"
HTTP_METHODS = (
    b"GET",
    b"POST",
    b"PUT",
    b"DELETE",
    b"HEAD",
    b"OPTIONS",
    b"PATCH",
    b"CONNECT",
    b"TRACE",
)
REQUEST_START_RE = re.compile(
    rb"(?:^|[\r\n])(" + b"|".join(HTTP_METHODS) + rb")\s+[^\r\n]{1,2048}\s+HTTP/\d(?:\.\d)?",
    re.IGNORECASE,
)
RESPONSE_START_RE = re.compile(rb"(?:^|[\r\n])HTTP/\d(?:\.\d)?\s+\d{3}[^\r\n]*", re.IGNORECASE)
ISSUE_BLOCK_RE = re.compile(br"<issue\b[^>]*>.*?</issue>", re.IGNORECASE | re.DOTALL)
SAFE_TAG_RE = re.compile(r"^[A-Za-z_][\w\-.]*$")
PRINTABLE_BYTES = set(b"\t\r\n") | set(range(32, 127))
XML_INVALID_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")


def detect_payload(raw: bytes) -> Tuple[str, bytes]:
    if raw.startswith(GZIP_MAGIC):
        with gzip.GzipFile(fileobj=io.BytesIO(raw)) as gz:
            raw = gz.read()
    if raw.startswith(ZIP_MAGIC):
        return "zip", raw
    if raw.startswith(SQLITE_MAGIC):
        return "sqlite", raw
    if raw.lstrip().startswith(b"<?xml") or raw.lstrip().startswith(b"<"):
        return "xml", raw
    return "unknown", raw


def extract_xml_from_zip(raw: bytes) -> Optional[bytes]:
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        xml_candidates = [n for n in zf.namelist() if n.lower().endswith(".xml")]
        if not xml_candidates:
            return None
        with zf.open(xml_candidates[0]) as xml_file:
            return xml_file.read()


def iter_tables(conn: sqlite3.Connection, only_tables: Optional[List[str]]) -> Iterable[str]:
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    tables = [row[0] for row in cursor.fetchall()]
    if only_tables:
        table_set = {t.strip() for t in only_tables if t.strip()}
        return [t for t in tables if t in table_set]
    return tables


def write_sqlite_as_xml(conn: sqlite3.Connection, output_path: str, only_tables: Optional[List[str]]) -> None:
    with open(output_path, "w", encoding="utf-8") as out:
        out.write('<?xml version="1.0" encoding="utf-8"?>\n')
        out.write('<burpProject source="sqlite">\n')
        for table in iter_tables(conn, only_tables):
            out.write(f'  <table name="{escape(table)}">\n')
            columns = [col[1] for col in conn.execute(f"PRAGMA table_info('{table}')").fetchall()]
            cursor = conn.execute(f"SELECT * FROM '{table}'")
            for row in cursor:
                out.write("    <row>\n")
                for col_name, value in zip(columns, row):
                    if value is None:
                        out.write(f'      <col name="{escape(col_name)}" null="true"/>\n')
                        continue
                    if isinstance(value, bytes):
                        encoded = base64.b64encode(value).decode("ascii")
                        out.write(
                            f'      <col name="{escape(col_name)}" encoding="base64">{encoded}</col>\n'
                        )
                        continue
                    out.write(
                        f'      <col name="{escape(col_name)}">{escape(str(value))}</col>\n'
                    )
                out.write("    </row>\n")
            out.write("  </table>\n")
        out.write("</burpProject>\n")


def iter_issue_blocks(file_path: str, chunk_size: int = 4 * 1024 * 1024) -> Iterator[bytes]:
    buffer = b""
    tail_keep = chunk_size
    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            buffer += chunk
            last_end = 0
            for match in ISSUE_BLOCK_RE.finditer(buffer):
                yield match.group(0)
                last_end = match.end()
            if last_end:
                buffer = buffer[last_end:]
            if len(buffer) > tail_keep:
                buffer = buffer[-tail_keep:]


def decode_issue_xml(block: bytes) -> Optional[ET.Element]:
    try:
        text = block.decode("utf-8")
    except UnicodeDecodeError:
        text = block.decode("latin-1", "replace")
    try:
        return ET.fromstring(text)
    except ET.ParseError:
        return None


def issue_text(element: ET.Element) -> str:
    return "".join(element.itertext()).strip()


def collect_issues(file_path: str, limit: Optional[int]) -> List[Dict[str, str]]:
    issues: List[Dict[str, str]] = []
    for block in iter_issue_blocks(file_path):
        element = decode_issue_xml(block)
        if element is None:
            continue
        issue: Dict[str, str] = {}
        for child in element:
            value = issue_text(child)
            if value:
                issue[child.tag] = value
        raw_b64 = base64.b64encode(block).decode("ascii")
        issue["raw"] = raw_b64
        if issue:
            issues.append(issue)
        if limit is not None and len(issues) >= limit:
            break
    return issues


def parse_headers(header_bytes: bytes) -> Tuple[str, Dict[str, str]]:
    lines = header_bytes.splitlines()
    if not lines:
        return "", {}
    first_line = lines[0].decode("latin-1", "replace").strip()
    headers: Dict[str, str] = {}
    for line in lines[1:]:
        if not line.strip():
            continue
        if b":" not in line:
            continue
        name, value = line.split(b":", 1)
        headers[name.decode("latin-1", "replace").strip().lower()] = value.decode("latin-1", "replace").strip()
    return first_line, headers


def split_http_message(message: bytes) -> Tuple[bytes, bytes]:
    header_end = message.find(b"\r\n\r\n")
    header_sep = 4
    if header_end == -1:
        header_end = message.find(b"\n\n")
        header_sep = 2
    if header_end == -1:
        return message, b""
    return message[:header_end], message[header_end + header_sep:]


def is_mostly_printable(data: bytes, threshold: float = 0.9) -> bool:
    if not data:
        return True
    printable = sum(1 for b in data if b in PRINTABLE_BYTES)
    return (printable / len(data)) >= threshold


def sanitize_xml_text(text: str) -> str:
    return XML_INVALID_RE.sub("", text)


def parse_chunked_end(buffer: bytes, start: int) -> Optional[int]:
    idx = start
    while True:
        line_end = buffer.find(b"\r\n", idx)
        line_break = 2
        if line_end == -1:
            line_end = buffer.find(b"\n", idx)
            line_break = 1
        if line_end == -1:
            return None
        size_line = buffer[idx:line_end].split(b";", 1)[0].strip()
        try:
            size = int(size_line, 16)
        except ValueError:
            return None
        idx = line_end + line_break
        if len(buffer) < idx + size + line_break:
            return None
        idx += size
        if buffer[idx:idx + 2] == b"\r\n":
            idx += 2
        elif buffer[idx:idx + 1] == b"\n":
            idx += 1
        else:
            return None
        if size == 0:
            return idx


def find_next_http_start(buffer: bytes) -> Optional[Tuple[int, str]]:
    req_match = REQUEST_START_RE.search(buffer)
    resp_match = RESPONSE_START_RE.search(buffer)
    matches = []
    if req_match:
        matches.append((req_match.start(), "request"))
    if resp_match:
        matches.append((resp_match.start(), "response"))
    if not matches:
        return None
    start, kind = min(matches, key=lambda item: item[0])
    while start < len(buffer) and buffer[start] in (10, 13):
        start += 1
    return start, kind


def extract_http_message(buffer: bytes) -> Optional[Tuple[bytes, str, Dict[str, str], bytes]]:
    found = find_next_http_start(buffer)
    if not found:
        return None
    start, _ = found
    header_end = buffer.find(b"\r\n\r\n", start)
    header_sep = 4
    if header_end == -1:
        header_end = buffer.find(b"\n\n", start)
        header_sep = 2
    if header_end == -1:
        return None
    header_bytes = buffer[start:header_end]
    first_line, headers = parse_headers(header_bytes)
    body_start = header_end + header_sep
    body_end = body_start
    if "content-length" in headers:
        try:
            length = int(headers["content-length"])
        except ValueError:
            length = 0
        if len(buffer) < body_start + length:
            return None
        body_end = body_start + length
    elif "transfer-encoding" in headers and "chunked" in headers["transfer-encoding"].lower():
        chunked_end = parse_chunked_end(buffer, body_start)
        if chunked_end is None:
            return None
        body_end = chunked_end
    message = buffer[start:body_end]
    remaining = buffer[body_end:]
    return message, first_line, headers, remaining


def iter_http_messages(file_path: str, chunk_size: int = 4 * 1024 * 1024) -> Iterator[Tuple[bytes, str, Dict[str, str]]]:
    buffer = b""
    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            buffer += chunk
            while True:
                extracted = extract_http_message(buffer)
                if not extracted:
                    if len(buffer) > chunk_size * 2:
                        buffer = buffer[-chunk_size:]
                    break
                message, first_line, headers, buffer = extracted
                yield message, first_line, headers


def request_metadata(first_line: str, headers: Dict[str, str]) -> Dict[str, str]:
    parts = first_line.split()
    if len(parts) < 2:
        return {}
    method = parts[0].upper()
    target = parts[1]
    host = headers.get("host", "")
    protocol = ""
    path = target
    url = ""
    port = ""
    if target.startswith("http://") or target.startswith("https://"):
        parsed = urlparse(target)
        protocol = parsed.scheme
        host = parsed.hostname or host
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"
        if parsed.port:
            port = str(parsed.port)
        else:
            port = "443" if protocol == "https" else "80"
        url = target
    elif host:
        protocol = "http"
        port = ""
        url = f"{protocol}://{host}{target}"
    return {
        "method": method,
        "path": path,
        "host": host,
        "protocol": protocol,
        "url": url,
        "port": port,
    }


def write_http_messages_as_xml(
    input_path: str,
    output_path: str,
    limit: Optional[int],
    issue_limit: Optional[int],
) -> int:
    pending_request: Optional[Tuple[bytes, str, Dict[str, str]]] = None
    count_items = 0
    issues = collect_issues(input_path, issue_limit)
    with open(output_path, "w", encoding="utf-8") as out:
        out.write('<?xml version="1.0" encoding="utf-8"?>\n')
        out.write("<burpExport>\n")
        out.write("  <items>\n")
        for message, first_line, headers in iter_http_messages(input_path):
            is_request = bool(first_line) and any(first_line.upper().startswith(m.decode("ascii")) for m in HTTP_METHODS)
            if is_request:
                if pending_request:
                    write_http_item(out, pending_request, None)
                    count_items += 1
                pending_request = (message, first_line, headers)
            else:
                if pending_request:
                    write_http_item(out, pending_request, (message, first_line, headers))
                    pending_request = None
                else:
                    write_http_item(out, None, (message, first_line, headers))
                count_items += 1
            if limit is not None and count_items >= limit:
                break
        if pending_request and (limit is None or count_items < limit):
            write_http_item(out, pending_request, None)
            count_items += 1
        out.write("  </items>\n")
        if issues:
            out.write("  <issues>\n")
            for issue in issues:
                out.write("    <issue>\n")
                for tag, value in issue.items():
                    if tag == "raw":
                        out.write(f'      <raw base64="true">{value}</raw>\n')
                        continue
                    if SAFE_TAG_RE.match(tag):
                        out.write(f"      <{tag}>{escape(sanitize_xml_text(value))}</{tag}>\n")
                    else:
                        out.write(
                            f'      <field name="{escape(sanitize_xml_text(tag))}">'
                            f"{escape(sanitize_xml_text(value))}</field>\n"
                        )
                out.write("    </issue>\n")
            out.write("  </issues>\n")
        out.write("</burpExport>\n")
    return count_items


def write_http_item(
    out: io.TextIOBase,
    request: Optional[Tuple[bytes, str, Dict[str, str]]],
    response: Optional[Tuple[bytes, str, Dict[str, str]]],
) -> None:
    out.write("  <item>\n")
    if request:
        req_bytes, req_line, req_headers = request
        meta = request_metadata(req_line, req_headers)
        if meta.get("url"):
            out.write(f"    <url>{escape(sanitize_xml_text(meta['url']))}</url>\n")
        if meta.get("host"):
            out.write(f"    <host>{escape(sanitize_xml_text(meta['host']))}</host>\n")
        if meta.get("port"):
            out.write(f"    <port>{escape(sanitize_xml_text(meta['port']))}</port>\n")
        if meta.get("protocol"):
            out.write(f"    <protocol>{escape(sanitize_xml_text(meta['protocol']))}</protocol>\n")
        if meta.get("method"):
            out.write(f"    <method>{escape(sanitize_xml_text(meta['method']))}</method>\n")
        if meta.get("path"):
            out.write(f"    <path>{escape(sanitize_xml_text(meta['path']))}</path>\n")
        req_header, req_body = split_http_message(req_bytes)
        if is_mostly_printable(req_bytes):
            req_text = req_bytes.decode("latin-1", "replace")
            out.write(f"    <request>{escape(sanitize_xml_text(req_text))}</request>\n")
        else:
            req_b64 = base64.b64encode(req_bytes).decode("ascii")
            out.write(f'    <request base64="true">{req_b64}</request>\n')
        out.write(f"    <requestLength>{len(req_bytes)}</requestLength>\n")
    if response:
        resp_bytes, resp_line, resp_headers = response
        resp_header, resp_body = split_http_message(resp_bytes)
        if resp_line:
            parts = resp_line.split()
            if len(parts) >= 2:
                out.write(f"    <status>{escape(sanitize_xml_text(parts[1]))}</status>\n")
        content_type = resp_headers.get("content-type")
        if content_type:
            out.write(f"    <mimeType>{escape(sanitize_xml_text(content_type))}</mimeType>\n")
        if is_mostly_printable(resp_bytes):
            resp_text = resp_bytes.decode("latin-1", "replace")
            out.write(f"    <response>{escape(sanitize_xml_text(resp_text))}</response>\n")
        else:
            resp_b64 = base64.b64encode(resp_bytes).decode("ascii")
            out.write(f'    <response base64="true">{resp_b64}</response>\n')
        out.write(f"    <responseLength>{len(resp_bytes)}</responseLength>\n")
    out.write("  </item>\n")


def build_default_output_path(input_path: str) -> str:
    base, _ = os.path.splitext(input_path)
    return f"{base}.xml"


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Convert Burp .burp file to XML. Supports XML, ZIP-with-XML, SQLite, "
            "or raw HTTP extraction with issue parsing."
        )
    )
    parser.add_argument("input", help="Path to .burp file")
    parser.add_argument("-o", "--output", help="Output XML path (default: <input>.xml)")
    parser.add_argument(
        "--table",
        action="append",
        help="SQLite table to export (can be repeated). If omitted, exports all tables.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of exported HTTP items (raw extraction mode).",
    )
    parser.add_argument(
        "--issue-limit",
        type=int,
        help="Limit number of exported issues (raw extraction mode).",
    )
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output or build_default_output_path(input_path)

    with open(input_path, "rb") as f:
        raw = f.read()

    kind, payload = detect_payload(raw)

    if kind == "xml":
        with open(output_path, "wb") as out:
            out.write(payload)
        return

    if kind == "zip":
        xml_payload = extract_xml_from_zip(payload)
        if not xml_payload:
            raise SystemExit("No XML found inside ZIP payload.")
        with open(output_path, "wb") as out:
            out.write(xml_payload)
        return

    if kind == "sqlite":
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(payload)
                tmp_path = tmp.name
            conn = sqlite3.connect(tmp_path)
            write_sqlite_as_xml(conn, output_path, args.table)
            conn.close()
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        return

    exported = write_http_messages_as_xml(input_path, output_path, args.limit, args.issue_limit)
    if exported == 0:
        raise SystemExit("Unsupported .burp format. Expected XML, ZIP-with-XML, SQLite, or raw HTTP data.")


if __name__ == "__main__":
    main()
