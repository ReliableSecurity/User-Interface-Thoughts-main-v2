import { db } from "./db";
import { projects, companies, hosts, services, tools, presets, vulnerabilities } from "@shared/schema";

export async function seedDatabase() {
  const existingTools = await db.select().from(tools);
  if (existingTools.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with initial data...");

  const [nmap] = await db.insert(tools).values({
    name: "nmap",
    description: "Инструмент сетевого сканирования и анализа безопасности",
    commandTemplate: "nmap -sV -sC $IP",
    isBuiltIn: true,
    category: "scanner",
    documentation: "https://nmap.org/book/man.html",
  }).returning();

  const [nuclei] = await db.insert(tools).values({
    name: "nuclei",
    description: "Быстрый и настраиваемый сканер уязвимостей на основе шаблонов",
    commandTemplate: "nuclei -u $IP -t http/cves/ -no-color",
    isBuiltIn: true,
    category: "vuln_scanner",
    documentation: "https://docs.projectdiscovery.io/tools/nuclei",
  }).returning();

  const [ffuf] = await db.insert(tools).values({
    name: "ffuf",
    description: "Быстрый веб-фаззер для поиска скрытого контента",
    commandTemplate: "ffuf -u http://$IP/FUZZ -w wordlist.txt",
    isBuiltIn: true,
    category: "web",
    documentation: "https://github.com/ffuf/ffuf",
  }).returning();

  const [crackmapexec] = await db.insert(tools).values({
    name: "crackmapexec",
    description: "Швейцарский нож для пентеста Windows/AD сетей",
    commandTemplate: "crackmapexec smb $IP",
    isBuiltIn: true,
    category: "ad_enum",
    documentation: "https://www.crackmapexec.wiki/",
  }).returning();

  const [nikto] = await db.insert(tools).values({
    name: "nikto",
    description: "Сканер веб-серверов на известные уязвимости",
    commandTemplate: "nikto -h $IP",
    isBuiltIn: true,
    category: "web",
    documentation: "https://cirt.net/Nikto2",
  }).returning();

  const [masscan] = await db.insert(tools).values({
    name: "masscan",
    description: "Самый быстрый сканер портов в интернете",
    commandTemplate: "masscan -p1-65535 $IP --rate=1000",
    isBuiltIn: true,
    category: "scanner",
    documentation: "https://github.com/robertdavidgraham/masscan",
  }).returning();

  const [gobuster] = await db.insert(tools).values({
    name: "gobuster",
    description: "Инструмент брутфорса директорий, DNS и vhosts",
    commandTemplate: "gobuster dir -u http://$IP -w wordlist.txt",
    isBuiltIn: true,
    category: "web",
    documentation: "https://github.com/OJ/gobuster",
  }).returning();

  const [sqlmap] = await db.insert(tools).values({
    name: "sqlmap",
    description: "Автоматизированный инструмент для обнаружения SQL-инъекций",
    commandTemplate: "sqlmap -u 'http://$IP/?id=1' --batch",
    isBuiltIn: true,
    category: "web",
    documentation: "https://sqlmap.org/",
  }).returning();

  const [hydra] = await db.insert(tools).values({
    name: "hydra",
    description: "Быстрый брутфорсер паролей для сетевых сервисов",
    commandTemplate: "hydra -l admin -P passwords.txt $IP ssh",
    isBuiltIn: true,
    category: "bruteforce",
    documentation: "https://github.com/vanhauser-thc/thc-hydra",
  }).returning();

  const [testssl] = await db.insert(tools).values({
    name: "testssl.sh",
    description: "Тестирование TLS/SSL криптографии веб-серверов",
    commandTemplate: "testssl.sh $IP",
    isBuiltIn: true,
    category: "web",
    documentation: "https://testssl.sh/",
  }).returning();

  const [wpscan] = await db.insert(tools).values({
    name: "wpscan",
    description: "Сканер безопасности WordPress",
    commandTemplate: "wpscan --url http://$IP",
    isBuiltIn: true,
    category: "web",
    documentation: "https://wpscan.com/",
  }).returning();

  const [enum4linux] = await db.insert(tools).values({
    name: "enum4linux",
    description: "Инструмент перечисления SMB/Samba для Linux",
    commandTemplate: "enum4linux -a $IP",
    isBuiltIn: true,
    category: "ad_enum",
    documentation: "https://github.com/CiscoCXSecurity/enum4linux",
  }).returning();

  const [whatweb] = await db.insert(tools).values({
    name: "whatweb",
    description: "Определение веб-технологий и CMS",
    commandTemplate: "whatweb http://$IP",
    isBuiltIn: true,
    category: "web",
    documentation: "https://www.morningstarsecurity.com/research/whatweb",
  }).returning();

  const [wfuzz] = await db.insert(tools).values({
    name: "wfuzz",
    description: "Веб-фаззер для брутфорса параметров и директорий",
    commandTemplate: "wfuzz -c -z file,wordlist.txt http://$IP/FUZZ",
    isBuiltIn: true,
    category: "web",
    documentation: "https://wfuzz.readthedocs.io/",
  }).returning();

  const [amass] = await db.insert(tools).values({
    name: "amass",
    description: "Инструмент для обнаружения поддоменов и сетевой разведки",
    commandTemplate: "amass enum -d $IP",
    isBuiltIn: true,
    category: "recon",
    documentation: "https://github.com/owasp-amass/amass",
  }).returning();

  const [subfinder] = await db.insert(tools).values({
    name: "subfinder",
    description: "Быстрый инструмент для обнаружения поддоменов",
    commandTemplate: "subfinder -d $IP",
    isBuiltIn: true,
    category: "recon",
    documentation: "https://github.com/projectdiscovery/subfinder",
  }).returning();

  const [httpx] = await db.insert(tools).values({
    name: "httpx",
    description: "Быстрый HTTP-пробер для анализа веб-серверов",
    commandTemplate: "httpx http://$IP -tech-detect -status-code",
    isBuiltIn: true,
    category: "web",
    documentation: "https://github.com/projectdiscovery/httpx",
  }).returning();

  const [feroxbuster] = await db.insert(tools).values({
    name: "feroxbuster",
    description: "Быстрый рекурсивный сканер директорий на Rust",
    commandTemplate: "feroxbuster -u http://$IP -w wordlist.txt",
    isBuiltIn: true,
    category: "web",
    documentation: "https://github.com/epi052/feroxbuster",
  }).returning();

  const [rustscan] = await db.insert(tools).values({
    name: "rustscan",
    description: "Сверхбыстрый сканер портов на Rust",
    commandTemplate: "rustscan -a $IP -- -sV",
    isBuiltIn: true,
    category: "scanner",
    documentation: "https://github.com/RustScan/RustScan",
  }).returning();

  const [smbclient] = await db.insert(tools).values({
    name: "smbclient",
    description: "Клиент для доступа к SMB-ресурсам",
    commandTemplate: "smbclient -L //$IP -N",
    isBuiltIn: true,
    category: "ad_enum",
    documentation: "https://www.samba.org/samba/docs/current/man-html/smbclient.1.html",
  }).returning();

  const [rpcclient] = await db.insert(tools).values({
    name: "rpcclient",
    description: "RPC-клиент для перечисления Windows/Samba",
    commandTemplate: "rpcclient -U '' -N $IP",
    isBuiltIn: true,
    category: "ad_enum",
    documentation: "https://www.samba.org/samba/docs/current/man-html/rpcclient.1.html",
  }).returning();

  const [netcat] = await db.insert(tools).values({
    name: "netcat",
    description: "Универсальный инструмент для работы с TCP/UDP соединениями",
    commandTemplate: "nc -nv $IP 80",
    isBuiltIn: true,
    category: "network",
    documentation: "https://nmap.org/ncat/",
  }).returning();

  const [curl] = await db.insert(tools).values({
    name: "curl",
    description: "Инструмент для передачи данных с URL",
    commandTemplate: "curl -I http://$IP",
    isBuiltIn: true,
    category: "web",
    documentation: "https://curl.se/docs/",
  }).returning();

  const [dig] = await db.insert(tools).values({
    name: "dig",
    description: "DNS lookup утилита",
    commandTemplate: "dig $IP ANY",
    isBuiltIn: true,
    category: "recon",
    documentation: "https://linux.die.net/man/1/dig",
  }).returning();

  const [whois] = await db.insert(tools).values({
    name: "whois",
    description: "Получение информации о регистрации домена",
    commandTemplate: "whois $IP",
    isBuiltIn: true,
    category: "recon",
    documentation: "https://linux.die.net/man/1/whois",
  }).returning();

  const [dirb] = await db.insert(tools).values({
    name: "dirb",
    description: "Сканер веб-контента для поиска скрытых директорий",
    commandTemplate: "dirb http://$IP",
    isBuiltIn: true,
    category: "web",
    documentation: "https://dirb.sourceforge.net/",
  }).returning();

  const [searchsploit] = await db.insert(tools).values({
    name: "searchsploit",
    description: "Поиск эксплойтов в базе Exploit-DB",
    commandTemplate: "searchsploit $IP",
    isBuiltIn: true,
    category: "exploit",
    documentation: "https://www.exploit-db.com/searchsploit",
  }).returning();

  const [john] = await db.insert(tools).values({
    name: "john",
    description: "John the Ripper - взлом паролей",
    commandTemplate: "john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt",
    isBuiltIn: true,
    category: "bruteforce",
    documentation: "https://www.openwall.com/john/",
  }).returning();

  const [hashcat] = await db.insert(tools).values({
    name: "hashcat",
    description: "Продвинутый инструмент восстановления паролей на GPU",
    commandTemplate: "hashcat -m 0 -a 0 hash.txt wordlist.txt",
    isBuiltIn: true,
    category: "bruteforce",
    documentation: "https://hashcat.net/hashcat/",
  }).returning();

  await db.insert(presets).values([
    // === NMAP - Обнаружение ===
    { name: "Ping Sweep", description: "Обнаружение живых хостов в сети", category: "Разведка", subcategory: "Обнаружение хостов", toolId: nmap.id, commandTemplate: "nmap -sn $IP", outputType: "hosts", riskLevel: "safe", estimatedTime: "1-5 мин", tags: ["discovery", "ping"] },
    { name: "ARP Scan", description: "Обнаружение хостов через ARP (локальная сеть)", category: "Разведка", subcategory: "Обнаружение хостов", toolId: nmap.id, commandTemplate: "nmap -sn -PR $IP", outputType: "hosts", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["discovery", "arp", "local"] },
    { name: "TCP SYN Scan", description: "Стандартное сканирование портов (полуоткрытое)", category: "Разведка", subcategory: "Сканирование портов", toolId: nmap.id, commandTemplate: "nmap -sS $IP", outputType: "services", riskLevel: "safe", estimatedTime: "2-10 мин", tags: ["ports", "tcp", "syn"] },
    { name: "TCP Connect Scan", description: "Полное TCP сканирование без root", category: "Разведка", subcategory: "Сканирование портов", toolId: nmap.id, commandTemplate: "nmap -sT $IP", outputType: "services", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["ports", "tcp"] },
    { name: "UDP Scan Top 100", description: "Сканирование топ-100 UDP портов", category: "Разведка", subcategory: "Сканирование портов", toolId: nmap.id, commandTemplate: "nmap -sU --top-ports 100 $IP", outputType: "services", riskLevel: "safe", estimatedTime: "10-30 мин", tags: ["ports", "udp"] },
    { name: "Full Port Scan", description: "Сканирование всех 65535 TCP портов", category: "Разведка", subcategory: "Сканирование портов", toolId: nmap.id, commandTemplate: "nmap -p- -T4 --min-rate=1000 $IP", outputType: "services", riskLevel: "safe", estimatedTime: "15-60 мин", tags: ["ports", "full"] },
    { name: "Quick Top 100", description: "Быстрое сканирование топ-100 портов", category: "Разведка", subcategory: "Сканирование портов", toolId: nmap.id, commandTemplate: "nmap -T4 --top-ports 100 $IP", outputType: "services", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["ports", "quick"] },
    
    // === NMAP - Перечисление ===
    { name: "Service Version Detection", description: "Определение версий сервисов", category: "Перечисление", subcategory: "Версии сервисов", toolId: nmap.id, commandTemplate: "nmap -sV --version-intensity 5 $IP", outputType: "services", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["version", "services"] },
    { name: "OS Detection", description: "Определение операционной системы", category: "Перечисление", subcategory: "ОС и сервисы", toolId: nmap.id, commandTemplate: "nmap -O --osscan-guess $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["os", "fingerprint"] },
    { name: "Aggressive Scan", description: "Агрессивное сканирование (версии, ОС, скрипты)", category: "Перечисление", subcategory: "ОС и сервисы", toolId: nmap.id, commandTemplate: "nmap -A -T4 $IP", outputType: "services", riskLevel: "moderate", estimatedTime: "10-30 мин", tags: ["aggressive", "full"] },
    { name: "Default Scripts", description: "Сканирование со стандартными NSE скриптами", category: "Перечисление", subcategory: "NSE скрипты", toolId: nmap.id, commandTemplate: "nmap -sC $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["nse", "scripts"] },
    
    // === NMAP - Специализированные скрипты ===
    { name: "SMB Enumeration", description: "Перечисление SMB (шары, пользователи)", category: "Перечисление", subcategory: "SMB/NetBIOS", toolId: nmap.id, commandTemplate: "nmap -p445 --script=smb-enum-shares,smb-enum-users,smb-os-discovery $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["smb", "windows"] },
    { name: "SMB Vulnerabilities", description: "Проверка SMB уязвимостей (EternalBlue и др.)", category: "Уязвимости", subcategory: "SMB", toolId: nmap.id, commandTemplate: "nmap -p445 --script=smb-vuln-* $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["smb", "vuln", "eternalblue"] },
    { name: "HTTP Enumeration", description: "Перечисление веб-сервера", category: "Перечисление", subcategory: "Web", toolId: nmap.id, commandTemplate: "nmap -p80,443,8080,8443 --script=http-enum,http-headers,http-methods $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["http", "web"] },
    { name: "SSH Audit", description: "Аудит SSH конфигурации", category: "Перечисление", subcategory: "SSH", toolId: nmap.id, commandTemplate: "nmap -p22 --script=ssh2-enum-algos,ssh-auth-methods $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["ssh", "audit"] },
    { name: "DNS Enumeration", description: "Перечисление DNS записей", category: "Перечисление", subcategory: "DNS", toolId: nmap.id, commandTemplate: "nmap -p53 --script=dns-zone-transfer,dns-brute $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "2-10 мин", tags: ["dns"] },
    { name: "LDAP Enumeration", description: "Перечисление LDAP/Active Directory", category: "Перечисление", subcategory: "LDAP/AD", toolId: nmap.id, commandTemplate: "nmap -p389,636 --script=ldap-rootdse,ldap-search $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["ldap", "ad"] },
    { name: "MySQL Enumeration", description: "Перечисление MySQL", category: "Перечисление", subcategory: "Базы данных", toolId: nmap.id, commandTemplate: "nmap -p3306 --script=mysql-info,mysql-enum $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["mysql", "database"] },
    { name: "MSSQL Enumeration", description: "Перечисление Microsoft SQL Server", category: "Перечисление", subcategory: "Базы данных", toolId: nmap.id, commandTemplate: "nmap -p1433 --script=ms-sql-info,ms-sql-config $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["mssql", "database"] },
    { name: "FTP Enumeration", description: "Перечисление FTP (анонимный вход)", category: "Перечисление", subcategory: "FTP", toolId: nmap.id, commandTemplate: "nmap -p21 --script=ftp-anon,ftp-bounce $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["ftp"] },
    { name: "SNMP Enumeration", description: "Перечисление SNMP community strings", category: "Перечисление", subcategory: "SNMP", toolId: nmap.id, commandTemplate: "nmap -sU -p161 --script=snmp-info,snmp-brute $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["snmp", "udp"] },
    { name: "VNC Enumeration", description: "Перечисление VNC", category: "Перечисление", subcategory: "Remote Desktop", toolId: nmap.id, commandTemplate: "nmap -p5900 --script=vnc-info $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["vnc"] },
    { name: "RDP Enumeration", description: "Перечисление RDP", category: "Перечисление", subcategory: "Remote Desktop", toolId: nmap.id, commandTemplate: "nmap -p3389 --script=rdp-enum-encryption,rdp-ntlm-info $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["rdp", "windows"] },
    
    // === NUCLEI - Сканирование уязвимостей ===
    { name: "Nuclei Full Scan", description: "Полное сканирование всеми шаблонами", category: "Уязвимости", subcategory: "Все", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t nuclei-templates/", outputType: "vuln", riskLevel: "moderate", estimatedTime: "30-120 мин", tags: ["nuclei", "full"] },
    { name: "CVE Scan", description: "Сканирование известных CVE", category: "Уязвимости", subcategory: "CVE", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t cves/", outputType: "vuln", riskLevel: "safe", estimatedTime: "10-30 мин", tags: ["nuclei", "cve"] },
    { name: "Critical CVE Only", description: "Только критические CVE", category: "Уязвимости", subcategory: "CVE", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t cves/ -severity critical", outputType: "vuln", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["nuclei", "cve", "critical"] },
    { name: "High Severity Scan", description: "High и Critical уязвимости", category: "Уязвимости", subcategory: "CVE", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -severity high,critical", outputType: "vuln", riskLevel: "safe", estimatedTime: "15-45 мин", tags: ["nuclei", "high", "critical"] },
    { name: "Exposed Panels", description: "Поиск открытых админ-панелей", category: "Уязвимости", subcategory: "Панели", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t exposed-panels/", outputType: "vuln", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["nuclei", "panels"] },
    { name: "Default Credentials", description: "Проверка стандартных учётных данных", category: "Уязвимости", subcategory: "Аутентификация", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t default-logins/", outputType: "vuln", riskLevel: "moderate", estimatedTime: "10-30 мин", tags: ["nuclei", "default", "creds"] },
    { name: "Misconfigurations", description: "Ошибки конфигурации", category: "Уязвимости", subcategory: "Конфигурация", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t misconfiguration/", outputType: "vuln", riskLevel: "safe", estimatedTime: "5-20 мин", tags: ["nuclei", "misconfig"] },
    { name: "Takeovers Check", description: "Проверка на subdomain takeover", category: "Уязвимости", subcategory: "Takeover", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t takeovers/", outputType: "vuln", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["nuclei", "takeover"] },
    { name: "Technologies Detection", description: "Определение используемых технологий", category: "Перечисление", subcategory: "Web", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t technologies/", outputType: "raw", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["nuclei", "tech"] },
    { name: "File Exposure", description: "Поиск утечки файлов и бэкапов", category: "Уязвимости", subcategory: "Утечки", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t exposures/files/", outputType: "vuln", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["nuclei", "files", "backup"] },
    { name: "Token Exposure", description: "Поиск утечки токенов и ключей", category: "Уязвимости", subcategory: "Утечки", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -t exposures/tokens/", outputType: "vuln", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["nuclei", "tokens", "keys"] },
    { name: "WordPress Scan", description: "Сканирование WordPress уязвимостей", category: "Уязвимости", subcategory: "CMS", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -tags wordpress", outputType: "vuln", riskLevel: "safe", estimatedTime: "10-30 мин", tags: ["nuclei", "wordpress", "cms"] },
    { name: "Joomla Scan", description: "Сканирование Joomla уязвимостей", category: "Уязвимости", subcategory: "CMS", toolId: nuclei.id, commandTemplate: "nuclei -u http://$IP -tags joomla", outputType: "vuln", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["nuclei", "joomla", "cms"] },
    { name: "Network CVE Scan", description: "CVE для сетевых сервисов", category: "Уязвимости", subcategory: "Сеть", toolId: nuclei.id, commandTemplate: "nuclei -target $IP -t network/cves/", outputType: "vuln", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["nuclei", "network", "cve"] },
    
    // === FFUF - Веб-фаззинг ===
    { name: "Directory Bruteforce", description: "Поиск скрытых директорий", category: "Web", subcategory: "Директории", toolId: ffuf.id, commandTemplate: "ffuf -u http://$IP/FUZZ -w /usr/share/wordlists/dirb/common.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-30 мин", tags: ["ffuf", "directories"] },
    { name: "Large Wordlist Dirs", description: "Директории большим словарём", category: "Web", subcategory: "Директории", toolId: ffuf.id, commandTemplate: "ffuf -u http://$IP/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "30-120 мин", tags: ["ffuf", "directories", "large"] },
    { name: "File Extensions", description: "Поиск файлов с расширениями", category: "Web", subcategory: "Файлы", toolId: ffuf.id, commandTemplate: "ffuf -u http://$IP/FUZZ -w /usr/share/wordlists/dirb/common.txt -e .php,.txt,.html,.bak,.old,.zip", outputType: "raw", riskLevel: "moderate", estimatedTime: "10-60 мин", tags: ["ffuf", "files", "extensions"] },
    { name: "API Endpoints", description: "Поиск API эндпоинтов", category: "Web", subcategory: "API", toolId: ffuf.id, commandTemplate: "ffuf -u http://$IP/api/FUZZ -w /usr/share/wordlists/dirb/common.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-20 мин", tags: ["ffuf", "api"] },
    { name: "Virtual Hosts", description: "Перебор виртуальных хостов", category: "Web", subcategory: "VHosts", toolId: ffuf.id, commandTemplate: "ffuf -u http://$IP -H 'Host: FUZZ.target.com' -w subdomains.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-30 мин", tags: ["ffuf", "vhosts"] },
    { name: "Parameter Fuzzing GET", description: "Фаззинг GET параметров", category: "Web", subcategory: "Параметры", toolId: ffuf.id, commandTemplate: "ffuf -u 'http://$IP?FUZZ=test' -w /usr/share/wordlists/burp/params.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-20 мин", tags: ["ffuf", "params", "get"] },
    { name: "Parameter Fuzzing POST", description: "Фаззинг POST параметров", category: "Web", subcategory: "Параметры", toolId: ffuf.id, commandTemplate: "ffuf -u http://$IP -X POST -d 'FUZZ=test' -w /usr/share/wordlists/burp/params.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-20 мин", tags: ["ffuf", "params", "post"] },
    
    // === GOBUSTER ===
    { name: "Gobuster Dir Scan", description: "Поиск директорий gobuster", category: "Web", subcategory: "Директории", toolId: gobuster.id, commandTemplate: "gobuster dir -u http://$IP -w /usr/share/wordlists/dirb/common.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-30 мин", tags: ["gobuster", "directories"] },
    { name: "DNS Subdomain Enum", description: "Перебор поддоменов", category: "Web", subcategory: "DNS", toolId: gobuster.id, commandTemplate: "gobuster dns -d $IP -w subdomains.txt", outputType: "raw", riskLevel: "safe", estimatedTime: "10-60 мин", tags: ["gobuster", "dns", "subdomains"] },
    
    // === NIKTO ===
    { name: "Web Vuln Scan", description: "Сканирование веб-уязвимостей", category: "Web", subcategory: "Уязвимости", toolId: nikto.id, commandTemplate: "nikto -h http://$IP", outputType: "raw", riskLevel: "moderate", estimatedTime: "10-30 мин", tags: ["nikto", "web", "vuln"] },
    { name: "Nikto SSL Scan", description: "Сканирование HTTPS сайта", category: "Web", subcategory: "Уязвимости", toolId: nikto.id, commandTemplate: "nikto -h https://$IP -ssl", outputType: "raw", riskLevel: "moderate", estimatedTime: "10-30 мин", tags: ["nikto", "ssl", "https"] },
    { name: "Nikto All Plugins", description: "Сканирование всеми плагинами", category: "Web", subcategory: "Уязвимости", toolId: nikto.id, commandTemplate: "nikto -h http://$IP -Plugins +all", outputType: "raw", riskLevel: "moderate", estimatedTime: "30-90 мин", tags: ["nikto", "full"] },
    
    // === CrackMapExec ===
    { name: "SMB Shares Enum", description: "Перечисление SMB шар", category: "AD/Windows", subcategory: "SMB", toolId: crackmapexec.id, commandTemplate: "crackmapexec smb $IP --shares", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["cme", "smb", "shares"] },
    { name: "SMB Users Enum", description: "Перечисление пользователей SMB", category: "AD/Windows", subcategory: "SMB", toolId: crackmapexec.id, commandTemplate: "crackmapexec smb $IP --users", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["cme", "smb", "users"] },
    { name: "SMB Sessions", description: "Активные SMB сессии", category: "AD/Windows", subcategory: "SMB", toolId: crackmapexec.id, commandTemplate: "crackmapexec smb $IP --sessions", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["cme", "smb", "sessions"] },
    { name: "SMB Password Spray", description: "Password spray атака на SMB", category: "AD/Windows", subcategory: "Брутфорс", toolId: crackmapexec.id, commandTemplate: "crackmapexec smb $IP -u users.txt -p 'Password123'", outputType: "raw", riskLevel: "high", estimatedTime: "5-30 мин", tags: ["cme", "smb", "spray"] },
    { name: "LDAP Enum", description: "LDAP перечисление AD", category: "AD/Windows", subcategory: "LDAP", toolId: crackmapexec.id, commandTemplate: "crackmapexec ldap $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["cme", "ldap", "ad"] },
    { name: "WinRM Check", description: "Проверка WinRM доступа", category: "AD/Windows", subcategory: "WinRM", toolId: crackmapexec.id, commandTemplate: "crackmapexec winrm $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["cme", "winrm"] },
    { name: "RDP Check", description: "Проверка RDP доступа", category: "AD/Windows", subcategory: "RDP", toolId: crackmapexec.id, commandTemplate: "crackmapexec rdp $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["cme", "rdp"] },
    { name: "MSSQL Enum", description: "Перечисление MSSQL серверов", category: "AD/Windows", subcategory: "Database", toolId: crackmapexec.id, commandTemplate: "crackmapexec mssql $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["cme", "mssql"] },
    
    // === HYDRA ===
    { name: "SSH Bruteforce", description: "Брутфорс SSH", category: "Брутфорс", subcategory: "SSH", toolId: hydra.id, commandTemplate: "hydra -l admin -P /usr/share/wordlists/rockyou.txt $IP ssh", outputType: "raw", riskLevel: "high", estimatedTime: "30-120 мин", tags: ["hydra", "ssh", "brute"] },
    { name: "FTP Bruteforce", description: "Брутфорс FTP", category: "Брутфорс", subcategory: "FTP", toolId: hydra.id, commandTemplate: "hydra -l admin -P passwords.txt $IP ftp", outputType: "raw", riskLevel: "high", estimatedTime: "15-60 мин", tags: ["hydra", "ftp", "brute"] },
    { name: "HTTP Basic Auth", description: "Брутфорс HTTP Basic Auth", category: "Брутфорс", subcategory: "HTTP", toolId: hydra.id, commandTemplate: "hydra -l admin -P passwords.txt $IP http-get /", outputType: "raw", riskLevel: "high", estimatedTime: "10-60 мин", tags: ["hydra", "http", "brute"] },
    { name: "HTTP POST Form", description: "Брутфорс веб-формы", category: "Брутфорс", subcategory: "HTTP", toolId: hydra.id, commandTemplate: "hydra -l admin -P passwords.txt $IP http-post-form '/login:user=^USER^&pass=^PASS^:Invalid'", outputType: "raw", riskLevel: "high", estimatedTime: "15-90 мин", tags: ["hydra", "http", "form"] },
    { name: "RDP Bruteforce", description: "Брутфорс RDP", category: "Брутфорс", subcategory: "RDP", toolId: hydra.id, commandTemplate: "hydra -l administrator -P passwords.txt $IP rdp", outputType: "raw", riskLevel: "high", estimatedTime: "30-120 мин", tags: ["hydra", "rdp", "brute"] },
    { name: "SMB Bruteforce", description: "Брутфорс SMB", category: "Брутфорс", subcategory: "SMB", toolId: hydra.id, commandTemplate: "hydra -l administrator -P passwords.txt $IP smb", outputType: "raw", riskLevel: "high", estimatedTime: "15-60 мин", tags: ["hydra", "smb", "brute"] },
    
    // === TESTSSL ===
    { name: "SSL/TLS Analysis", description: "Полный анализ SSL/TLS", category: "Web", subcategory: "SSL/TLS", toolId: testssl.id, commandTemplate: "testssl.sh --quiet $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["ssl", "tls", "crypto"] },
    { name: "SSL Vulnerabilities", description: "Проверка SSL уязвимостей", category: "Уязвимости", subcategory: "SSL/TLS", toolId: testssl.id, commandTemplate: "testssl.sh --vuln $IP", outputType: "vuln", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["ssl", "vuln"] },
    
    // === SQLMAP ===
    { name: "SQLi Detection", description: "Обнаружение SQL-инъекций", category: "Web", subcategory: "Инъекции", toolId: sqlmap.id, commandTemplate: "sqlmap -u 'http://$IP/?id=1' --batch --level=2", outputType: "vuln", riskLevel: "moderate", estimatedTime: "10-60 мин", tags: ["sqlmap", "sqli"] },
    { name: "SQLi Full Scan", description: "Полное сканирование SQLi", category: "Web", subcategory: "Инъекции", toolId: sqlmap.id, commandTemplate: "sqlmap -u 'http://$IP/?id=1' --batch --level=5 --risk=3", outputType: "vuln", riskLevel: "high", estimatedTime: "30-180 мин", tags: ["sqlmap", "sqli", "full"] },
    { name: "SQLi Database Enum", description: "Перечисление баз данных", category: "Web", subcategory: "Инъекции", toolId: sqlmap.id, commandTemplate: "sqlmap -u 'http://$IP/?id=1' --batch --dbs", outputType: "raw", riskLevel: "high", estimatedTime: "5-30 мин", tags: ["sqlmap", "dbs"] },
    
    // === MASSCAN ===
    { name: "Ultra Fast Port Scan", description: "Сверхбыстрое сканирование всех портов", category: "Разведка", subcategory: "Сканирование портов", toolId: masscan.id, commandTemplate: "masscan -p1-65535 $IP --rate=1000 -oL output.txt", outputType: "services", riskLevel: "moderate", estimatedTime: "5-15 мин", tags: ["masscan", "fast", "ports"] },
    { name: "Top Ports Fast", description: "Быстрое сканирование популярных портов", category: "Разведка", subcategory: "Сканирование портов", toolId: masscan.id, commandTemplate: "masscan -p21,22,23,25,53,80,110,139,443,445,1433,3306,3389,5432,8080 $IP --rate=1000", outputType: "services", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["masscan", "quick"] },
    
    // === WPSCAN - WordPress ===
    { name: "WP Full Scan", description: "Полное сканирование WordPress", category: "Web", subcategory: "WordPress", toolId: wpscan.id, commandTemplate: "wpscan --url http://$IP --enumerate p,t,u", outputType: "vuln", riskLevel: "safe", estimatedTime: "10-30 мин", tags: ["wpscan", "wordpress", "full"] },
    { name: "WP Plugin Scan", description: "Сканирование плагинов WordPress", category: "Web", subcategory: "WordPress", toolId: wpscan.id, commandTemplate: "wpscan --url http://$IP --enumerate p --plugins-detection aggressive", outputType: "vuln", riskLevel: "moderate", estimatedTime: "15-60 мин", tags: ["wpscan", "plugins"] },
    { name: "WP User Enum", description: "Перечисление пользователей WordPress", category: "Перечисление", subcategory: "WordPress", toolId: wpscan.id, commandTemplate: "wpscan --url http://$IP --enumerate u", outputType: "raw", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["wpscan", "users"] },
    { name: "WP Vulnerabilities", description: "Проверка уязвимостей WordPress (с API)", category: "Уязвимости", subcategory: "WordPress", toolId: wpscan.id, commandTemplate: "wpscan --url http://$IP --api-token YOUR_TOKEN", outputType: "vuln", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["wpscan", "vuln"] },
    { name: "WP Password Attack", description: "Брутфорс паролей WordPress", category: "Брутфорс", subcategory: "WordPress", toolId: wpscan.id, commandTemplate: "wpscan --url http://$IP --passwords passwords.txt --usernames admin", outputType: "raw", riskLevel: "high", estimatedTime: "30-120 мин", tags: ["wpscan", "brute"] },
    
    // === ENUM4LINUX - SMB/Samba ===
    { name: "Full SMB Enum", description: "Полное перечисление SMB/Samba", category: "Перечисление", subcategory: "SMB", toolId: enum4linux.id, commandTemplate: "enum4linux -a $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["enum4linux", "smb", "full"] },
    { name: "SMB Users", description: "Перечисление пользователей через SMB", category: "Перечисление", subcategory: "SMB", toolId: enum4linux.id, commandTemplate: "enum4linux -U $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["enum4linux", "users"] },
    { name: "SMB Shares", description: "Перечисление SMB шар", category: "Перечисление", subcategory: "SMB", toolId: enum4linux.id, commandTemplate: "enum4linux -S $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["enum4linux", "shares"] },
    { name: "SMB Groups", description: "Перечисление групп через SMB", category: "Перечисление", subcategory: "SMB", toolId: enum4linux.id, commandTemplate: "enum4linux -G $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["enum4linux", "groups"] },
    { name: "SMB Password Policy", description: "Политика паролей через SMB", category: "Перечисление", subcategory: "SMB", toolId: enum4linux.id, commandTemplate: "enum4linux -P $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["enum4linux", "policy"] },
    
    // === WHATWEB - Web Fingerprinting ===
    { name: "Tech Detection", description: "Определение веб-технологий", category: "Перечисление", subcategory: "Web", toolId: whatweb.id, commandTemplate: "whatweb http://$IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["whatweb", "tech"] },
    { name: "Verbose Tech Scan", description: "Детальный анализ технологий", category: "Перечисление", subcategory: "Web", toolId: whatweb.id, commandTemplate: "whatweb -v http://$IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["whatweb", "verbose"] },
    { name: "Aggressive Tech Scan", description: "Агрессивное определение технологий", category: "Перечисление", subcategory: "Web", toolId: whatweb.id, commandTemplate: "whatweb -a 3 http://$IP", outputType: "raw", riskLevel: "moderate", estimatedTime: "2-5 мин", tags: ["whatweb", "aggressive"] },
    
    // === WFUZZ - Web Fuzzing ===
    { name: "Directory Fuzz", description: "Фаззинг директорий", category: "Web", subcategory: "Фаззинг", toolId: wfuzz.id, commandTemplate: "wfuzz -c -z file,/usr/share/wordlists/dirb/common.txt --hc 404 http://$IP/FUZZ", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-30 мин", tags: ["wfuzz", "directories"] },
    { name: "Parameter Fuzz", description: "Фаззинг параметров", category: "Web", subcategory: "Фаззинг", toolId: wfuzz.id, commandTemplate: "wfuzz -c -z file,params.txt --hc 404 'http://$IP/?FUZZ=test'", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-20 мин", tags: ["wfuzz", "params"] },
    { name: "Subdomain Fuzz", description: "Фаззинг поддоменов", category: "Разведка", subcategory: "Поддомены", toolId: wfuzz.id, commandTemplate: "wfuzz -c -z file,subdomains.txt --hc 404 -H 'Host: FUZZ.$IP' http://$IP", outputType: "raw", riskLevel: "safe", estimatedTime: "5-30 мин", tags: ["wfuzz", "subdomains"] },
    { name: "Header Fuzz", description: "Фаззинг HTTP заголовков", category: "Web", subcategory: "Фаззинг", toolId: wfuzz.id, commandTemplate: "wfuzz -c -z file,headers.txt --hc 404 -H 'FUZZ: test' http://$IP", outputType: "raw", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["wfuzz", "headers"] },
    
    // === AMASS - Subdomain Enumeration ===
    { name: "Passive Subdomain Enum", description: "Пассивное перечисление поддоменов", category: "Разведка", subcategory: "Поддомены", toolId: amass.id, commandTemplate: "amass enum -passive -d $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["amass", "passive", "subdomains"] },
    { name: "Active Subdomain Enum", description: "Активное перечисление поддоменов", category: "Разведка", subcategory: "Поддомены", toolId: amass.id, commandTemplate: "amass enum -active -d $IP", outputType: "raw", riskLevel: "moderate", estimatedTime: "15-60 мин", tags: ["amass", "active", "subdomains"] },
    { name: "Subdomain Brute", description: "Брутфорс поддоменов", category: "Разведка", subcategory: "Поддомены", toolId: amass.id, commandTemplate: "amass enum -brute -d $IP", outputType: "raw", riskLevel: "moderate", estimatedTime: "30-120 мин", tags: ["amass", "brute", "subdomains"] },
    { name: "ASN Discovery", description: "Обнаружение ASN и связанных сетей", category: "Разведка", subcategory: "Сеть", toolId: amass.id, commandTemplate: "amass intel -asn YOUR_ASN", outputType: "raw", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["amass", "asn"] },
    
    // === SUBFINDER - Fast Subdomain Enum ===
    { name: "Quick Subdomain Scan", description: "Быстрое сканирование поддоменов", category: "Разведка", subcategory: "Поддомены", toolId: subfinder.id, commandTemplate: "subfinder -d $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-5 мин", tags: ["subfinder", "subdomains"] },
    { name: "Recursive Subdomain", description: "Рекурсивное сканирование поддоменов", category: "Разведка", subcategory: "Поддомены", toolId: subfinder.id, commandTemplate: "subfinder -d $IP -recursive", outputType: "raw", riskLevel: "safe", estimatedTime: "5-20 мин", tags: ["subfinder", "recursive"] },
    { name: "All Sources Subdomain", description: "Использование всех источников", category: "Разведка", subcategory: "Поддомены", toolId: subfinder.id, commandTemplate: "subfinder -d $IP -all", outputType: "raw", riskLevel: "safe", estimatedTime: "3-10 мин", tags: ["subfinder", "all"] },
    
    // === HTTPX - HTTP Probing ===
    { name: "HTTP Probe", description: "Проверка HTTP/HTTPS доступности", category: "Перечисление", subcategory: "Web", toolId: httpx.id, commandTemplate: "httpx -u http://$IP -status-code -title -tech-detect", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["httpx", "probe"] },
    { name: "HTTP Screenshot", description: "Скриншоты веб-страниц", category: "Перечисление", subcategory: "Web", toolId: httpx.id, commandTemplate: "httpx -u http://$IP -screenshot", outputType: "raw", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["httpx", "screenshot"] },
    { name: "HTTPX Headers", description: "Анализ HTTP заголовков через httpx", category: "Перечисление", subcategory: "Web", toolId: httpx.id, commandTemplate: "httpx -u http://$IP -include-response-header", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["httpx", "headers"] },
    { name: "Web Server Info", description: "Информация о веб-сервере", category: "Перечисление", subcategory: "Web", toolId: httpx.id, commandTemplate: "httpx -u http://$IP -server -websocket -cname -asn", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["httpx", "info"] },
    
    // === FEROXBUSTER - Directory Bruteforce ===
    { name: "Fast Dir Scan", description: "Быстрое сканирование директорий", category: "Web", subcategory: "Директории", toolId: feroxbuster.id, commandTemplate: "feroxbuster -u http://$IP -w /usr/share/wordlists/dirb/common.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-20 мин", tags: ["feroxbuster", "directories"] },
    { name: "Recursive Dir Scan", description: "Рекурсивное сканирование директорий", category: "Web", subcategory: "Директории", toolId: feroxbuster.id, commandTemplate: "feroxbuster -u http://$IP -w wordlist.txt --depth 3", outputType: "raw", riskLevel: "moderate", estimatedTime: "15-60 мин", tags: ["feroxbuster", "recursive"] },
    { name: "Extension Scan", description: "Поиск файлов с расширениями", category: "Web", subcategory: "Директории", toolId: feroxbuster.id, commandTemplate: "feroxbuster -u http://$IP -w wordlist.txt -x php,txt,html,js", outputType: "raw", riskLevel: "moderate", estimatedTime: "10-45 мин", tags: ["feroxbuster", "extensions"] },
    
    // === RUSTSCAN - Fast Port Scanner ===
    { name: "Rust Fast Scan", description: "Сверхбыстрое сканирование портов", category: "Разведка", subcategory: "Сканирование портов", toolId: rustscan.id, commandTemplate: "rustscan -a $IP --ulimit 5000", outputType: "services", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["rustscan", "fast"] },
    { name: "Rust + Nmap", description: "Быстрое сканирование + nmap детекция", category: "Разведка", subcategory: "Сканирование портов", toolId: rustscan.id, commandTemplate: "rustscan -a $IP -- -sV -sC", outputType: "services", riskLevel: "safe", estimatedTime: "5-15 мин", tags: ["rustscan", "nmap"] },
    { name: "Rust Range Scan", description: "Сканирование диапазона портов", category: "Разведка", subcategory: "Сканирование портов", toolId: rustscan.id, commandTemplate: "rustscan -a $IP -r 1-10000", outputType: "services", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["rustscan", "range"] },
    
    // === SMBCLIENT - SMB Access ===
    { name: "List SMB Shares", description: "Список SMB шар", category: "Перечисление", subcategory: "SMB", toolId: smbclient.id, commandTemplate: "smbclient -L //$IP -N", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["smbclient", "shares"] },
    { name: "Connect Anonymous", description: "Анонимное подключение к шаре", category: "Перечисление", subcategory: "SMB", toolId: smbclient.id, commandTemplate: "smbclient //$IP/share -N", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["smbclient", "anonymous"] },
    { name: "Download All", description: "Скачать всё из шары", category: "Эксплуатация", subcategory: "SMB", toolId: smbclient.id, commandTemplate: "smbclient //$IP/share -N -c 'recurse; prompt; mget *'", outputType: "raw", riskLevel: "moderate", estimatedTime: "5-30 мин", tags: ["smbclient", "download"] },
    
    // === RPCCLIENT - RPC Enumeration ===
    { name: "RPC Null Session", description: "Подключение через null session", category: "Перечисление", subcategory: "RPC", toolId: rpcclient.id, commandTemplate: "rpcclient -U '' -N $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["rpcclient", "null"] },
    { name: "RPC User Enum", description: "Перечисление пользователей через RPC", category: "Перечисление", subcategory: "RPC", toolId: rpcclient.id, commandTemplate: "rpcclient -U '' -N $IP -c 'enumdomusers'", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["rpcclient", "users"] },
    { name: "RPC Domain Info", description: "Информация о домене", category: "Перечисление", subcategory: "RPC", toolId: rpcclient.id, commandTemplate: "rpcclient -U '' -N $IP -c 'querydominfo'", outputType: "raw", riskLevel: "safe", estimatedTime: "1-2 мин", tags: ["rpcclient", "domain"] },
    { name: "RPC SID Lookup", description: "Поиск SID пользователей", category: "Перечисление", subcategory: "RPC", toolId: rpcclient.id, commandTemplate: "rpcclient -U '' -N $IP -c 'lsaenumsid'", outputType: "raw", riskLevel: "safe", estimatedTime: "1-3 мин", tags: ["rpcclient", "sid"] },
    
    // === NETCAT - Network Utility ===
    { name: "Banner Grab", description: "Получение баннера сервиса", category: "Перечисление", subcategory: "Сеть", toolId: netcat.id, commandTemplate: "nc -nv $IP 80", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["netcat", "banner"] },
    { name: "Port Check", description: "Проверка порта", category: "Разведка", subcategory: "Сеть", toolId: netcat.id, commandTemplate: "nc -zv $IP 1-1000", outputType: "raw", riskLevel: "safe", estimatedTime: "2-5 мин", tags: ["netcat", "ports"] },
    { name: "UDP Check", description: "Проверка UDP порта", category: "Разведка", subcategory: "Сеть", toolId: netcat.id, commandTemplate: "nc -zuv $IP 53", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["netcat", "udp"] },
    
    // === CURL - HTTP Requests ===
    { name: "HTTP Headers", description: "Получение HTTP заголовков", category: "Перечисление", subcategory: "Web", toolId: curl.id, commandTemplate: "curl -I http://$IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["curl", "headers"] },
    { name: "Full Response", description: "Полный HTTP ответ", category: "Перечисление", subcategory: "Web", toolId: curl.id, commandTemplate: "curl -v http://$IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["curl", "verbose"] },
    { name: "SSL Info", description: "Информация о SSL сертификате", category: "Перечисление", subcategory: "SSL/TLS", toolId: curl.id, commandTemplate: "curl -vI https://$IP 2>&1 | grep -A10 'Server certificate'", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["curl", "ssl"] },
    { name: "Follow Redirects", description: "Следовать редиректам", category: "Перечисление", subcategory: "Web", toolId: curl.id, commandTemplate: "curl -L -v http://$IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["curl", "redirect"] },
    
    // === DIG - DNS Lookup ===
    { name: "DNS A Record", description: "Получение A записей", category: "Разведка", subcategory: "DNS", toolId: dig.id, commandTemplate: "dig $IP A", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["dig", "dns", "a"] },
    { name: "DNS All Records", description: "Все DNS записи", category: "Разведка", subcategory: "DNS", toolId: dig.id, commandTemplate: "dig $IP ANY", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["dig", "dns", "all"] },
    { name: "DNS Zone Transfer", description: "Попытка zone transfer", category: "Разведка", subcategory: "DNS", toolId: dig.id, commandTemplate: "dig axfr @$IP domain.com", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["dig", "dns", "axfr"] },
    { name: "Reverse DNS", description: "Обратный DNS запрос", category: "Разведка", subcategory: "DNS", toolId: dig.id, commandTemplate: "dig -x $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["dig", "dns", "reverse"] },
    
    // === WHOIS - Domain Info ===
    { name: "WHOIS Lookup", description: "Информация о домене/IP", category: "Разведка", subcategory: "OSINT", toolId: whois.id, commandTemplate: "whois $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["whois", "osint"] },
    
    // === DIRB - Web Content Scanner ===
    { name: "Basic Dir Scan", description: "Базовое сканирование директорий", category: "Web", subcategory: "Директории", toolId: dirb.id, commandTemplate: "dirb http://$IP", outputType: "raw", riskLevel: "moderate", estimatedTime: "10-45 мин", tags: ["dirb", "directories"] },
    { name: "Custom Wordlist", description: "Сканирование со своим словарём", category: "Web", subcategory: "Директории", toolId: dirb.id, commandTemplate: "dirb http://$IP /usr/share/wordlists/dirb/big.txt", outputType: "raw", riskLevel: "moderate", estimatedTime: "30-120 мин", tags: ["dirb", "wordlist"] },
    { name: "Extension Search", description: "Поиск с расширениями", category: "Web", subcategory: "Директории", toolId: dirb.id, commandTemplate: "dirb http://$IP -X .php,.txt,.html", outputType: "raw", riskLevel: "moderate", estimatedTime: "15-60 мин", tags: ["dirb", "extensions"] },
    
    // === SEARCHSPLOIT - Exploit Search ===
    { name: "Search Exploits", description: "Поиск эксплойтов по ключевому слову", category: "Эксплуатация", subcategory: "Поиск", toolId: searchsploit.id, commandTemplate: "searchsploit $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["searchsploit", "exploits"] },
    { name: "Search with Details", description: "Поиск с подробностями", category: "Эксплуатация", subcategory: "Поиск", toolId: searchsploit.id, commandTemplate: "searchsploit -v $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["searchsploit", "verbose"] },
    { name: "Copy Exploit", description: "Копирование эксплойта", category: "Эксплуатация", subcategory: "Поиск", toolId: searchsploit.id, commandTemplate: "searchsploit -m 12345", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["searchsploit", "copy"] },
    
    // === JOHN - Password Cracking ===
    { name: "Wordlist Attack", description: "Атака по словарю", category: "Брутфорс", subcategory: "Хэши", toolId: john.id, commandTemplate: "john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt", outputType: "raw", riskLevel: "high", estimatedTime: "30-180 мин", tags: ["john", "wordlist"] },
    { name: "Show Cracked", description: "Показать взломанные пароли", category: "Брутфорс", subcategory: "Хэши", toolId: john.id, commandTemplate: "john --show hashes.txt", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["john", "show"] },
    { name: "Format Detection", description: "Определение формата хэша", category: "Брутфорс", subcategory: "Хэши", toolId: john.id, commandTemplate: "john --list=formats | grep -i $IP", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["john", "format"] },
    { name: "Rules Attack", description: "Атака с правилами мутации", category: "Брутфорс", subcategory: "Хэши", toolId: john.id, commandTemplate: "john --wordlist=wordlist.txt --rules hashes.txt", outputType: "raw", riskLevel: "high", estimatedTime: "60-360 мин", tags: ["john", "rules"] },
    
    // === HASHCAT - GPU Cracking ===
    { name: "MD5 Wordlist", description: "Взлом MD5 по словарю", category: "Брутфорс", subcategory: "Хэши", toolId: hashcat.id, commandTemplate: "hashcat -m 0 -a 0 hash.txt wordlist.txt", outputType: "raw", riskLevel: "high", estimatedTime: "10-120 мин", tags: ["hashcat", "md5"] },
    { name: "NTLM Wordlist", description: "Взлом NTLM по словарю", category: "Брутфорс", subcategory: "Хэши", toolId: hashcat.id, commandTemplate: "hashcat -m 1000 -a 0 hash.txt wordlist.txt", outputType: "raw", riskLevel: "high", estimatedTime: "10-120 мин", tags: ["hashcat", "ntlm"] },
    { name: "Hashcat Bruteforce", description: "Полный перебор", category: "Брутфорс", subcategory: "Хэши", toolId: hashcat.id, commandTemplate: "hashcat -m 0 -a 3 hash.txt ?a?a?a?a?a?a", outputType: "raw", riskLevel: "high", estimatedTime: "60-480 мин", tags: ["hashcat", "brute"] },
    { name: "Show Cracked Hashcat", description: "Показать взломанные пароли", category: "Брутфорс", subcategory: "Хэши", toolId: hashcat.id, commandTemplate: "hashcat -m 0 hash.txt --show", outputType: "raw", riskLevel: "safe", estimatedTime: "1 мин", tags: ["hashcat", "show"] },
  ]);

  const [demoProject] = await db.insert(projects).values({
    name: "Внутренняя сеть - Q1 2026",
    description: "Ежеквартальный аудит безопасности внутренней сети 192.168.1.0/24",
  }).returning();
  
  const [demoCompany] = await db.insert(companies).values({
    projectId: demoProject.id,
    name: "Основная инфраструктура",
    description: "Актуальная компания для текущего проекта",
  }).returning();

  const hostServicesData = [
    { 
      ip: "192.168.1.1", 
      os: "Windows Server 2019", 
      equipment: "Контроллер домена",
      services: [
        { port: 53, protocol: "TCP", serviceName: "DNS", version: "Microsoft DNS", comment: "Основной DNS сервер", state: "open" },
        { port: 88, protocol: "TCP", serviceName: "Kerberos", version: "Microsoft Windows Kerberos", comment: "Kerberos KDC", state: "open" },
        { port: 389, protocol: "TCP", serviceName: "LDAP", version: "Microsoft Windows AD", comment: "LDAP каталог", state: "open" },
        { port: 445, protocol: "TCP", serviceName: "SMB", version: "3.1.1", comment: "SMB шары, SYSVOL доступен", state: "open" },
        { port: 3389, protocol: "TCP", serviceName: "RDP", version: "10.0", comment: "RDP включен, NLA", state: "open" },
      ]
    },
    { 
      ip: "192.168.1.10", 
      os: "Linux", 
      equipment: "Веб-сервер",
      services: [
        { port: 22, protocol: "TCP", serviceName: "SSH", version: "OpenSSH 8.9", comment: "Root login отключен", state: "open" },
        { port: 80, protocol: "TCP", serviceName: "HTTP", version: "nginx 1.24", comment: "Перенаправление на HTTPS", state: "open" },
        { port: 443, protocol: "TCP", serviceName: "HTTPS", version: "nginx 1.24", comment: "Основной сайт, WordPress 6.4", state: "open" },
        { port: 3306, protocol: "TCP", serviceName: "MySQL", version: "8.0.35", comment: "Локальный доступ только", state: "open" },
      ]
    },
    { 
      ip: "192.168.1.20", 
      os: "Windows 10", 
      equipment: "Рабочая станция",
      services: [
        { port: 135, protocol: "TCP", serviceName: "RPC", comment: "Microsoft RPC", state: "open" },
        { port: 445, protocol: "TCP", serviceName: "SMB", version: "3.1.1", comment: "Шары C$ и ADMIN$ доступны", state: "open" },
        { port: 3389, protocol: "TCP", serviceName: "RDP", comment: "RDP доступен, слабый пароль", state: "open" },
      ]
    },
    { 
      ip: "192.168.1.50", 
      os: "Linux", 
      equipment: "Сервер БД",
      services: [
        { port: 22, protocol: "TCP", serviceName: "SSH", version: "OpenSSH 7.9", comment: "Устаревшая версия!", state: "open" },
        { port: 5432, protocol: "TCP", serviceName: "PostgreSQL", version: "14.10", comment: "Удалённый доступ включен", state: "open" },
      ]
    },
    { 
      ip: "192.168.1.100", 
      os: "Cisco IOS", 
      equipment: "Роутер",
      services: [
        { port: 22, protocol: "TCP", serviceName: "SSH", version: "Cisco SSH 2.0", comment: "Управление роутером", state: "open" },
        { port: 23, protocol: "TCP", serviceName: "Telnet", comment: "НЕБЕЗОПАСНО! Telnet включен", state: "open" },
        { port: 161, protocol: "UDP", serviceName: "SNMP", version: "v2c", comment: "Community string: public", state: "open" },
      ]
    },
    { 
      ip: "192.168.1.200", 
      os: "Windows Server 2016", 
      equipment: "Файловый сервер",
      services: [
        { port: 21, protocol: "TCP", serviceName: "FTP", version: "Microsoft IIS FTP", comment: "Анонимный вход РАЗРЕШЁН!", state: "open" },
        { port: 445, protocol: "TCP", serviceName: "SMB", version: "3.0", comment: "Много открытых шар", state: "open" },
        { port: 3389, protocol: "TCP", serviceName: "RDP", version: "10.0", comment: "Слабая политика паролей", state: "open" },
      ]
    },
  ];

  const createdHosts: { host: typeof hosts.$inferSelect; ip: string }[] = [];
  const createdServices: { service: typeof services.$inferSelect; hostIp: string }[] = [];

  for (const data of hostServicesData) {
    const [host] = await db.insert(hosts).values({
      projectId: demoProject.id,
      companyId: demoCompany.id,
      ipAddress: data.ip,
      os: data.os,
      equipment: data.equipment,
    }).returning();
    
    createdHosts.push({ host, ip: data.ip });

    for (const svc of data.services) {
      const [service] = await db.insert(services).values({
        hostId: host.id,
        port: svc.port,
        protocol: svc.protocol,
        serviceName: svc.serviceName,
        version: svc.version,
        comment: svc.comment,
        state: svc.state || "open",
      }).returning();
      
      createdServices.push({ service, hostIp: data.ip });
    }
  }

  const dcHost = createdHosts.find(h => h.ip === "192.168.1.1")!;
  const webHost = createdHosts.find(h => h.ip === "192.168.1.10")!;
  const wsHost = createdHosts.find(h => h.ip === "192.168.1.20")!;
  const dbHost = createdHosts.find(h => h.ip === "192.168.1.50")!;
  const routerHost = createdHosts.find(h => h.ip === "192.168.1.100")!;
  const fileHost = createdHosts.find(h => h.ip === "192.168.1.200")!;

  const smbDC = createdServices.find(s => s.hostIp === "192.168.1.1" && s.service.serviceName === "SMB")!;
  const httpsWeb = createdServices.find(s => s.hostIp === "192.168.1.10" && s.service.serviceName === "HTTPS")!;
  const rdpWS = createdServices.find(s => s.hostIp === "192.168.1.20" && s.service.serviceName === "RDP")!;
  const sshDB = createdServices.find(s => s.hostIp === "192.168.1.50" && s.service.serviceName === "SSH")!;
  const telnetRouter = createdServices.find(s => s.hostIp === "192.168.1.100" && s.service.serviceName === "Telnet")!;
  const snmpRouter = createdServices.find(s => s.hostIp === "192.168.1.100" && s.service.serviceName === "SNMP")!;
  const ftpFile = createdServices.find(s => s.hostIp === "192.168.1.200" && s.service.serviceName === "FTP")!;

  await db.insert(vulnerabilities).values([
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: dcHost.host.id,
      serviceId: smbDC.service.id,
      name: "SMB Signing Not Required",
      severity: "medium",
      description: "SMB подписывание не обязательно, что позволяет атаки relay",
      solution: "Включить обязательное SMB signing через групповые политики",
      scanner: "nmap",
      templateId: "smb-signing-not-required",
      status: "open",
      rawOutput: "Host script results:\n|_smb-signing: signing is not required",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: webHost.host.id,
      serviceId: httpsWeb.service.id,
      name: "WordPress Outdated Version",
      severity: "medium",
      cve: "CVE-2024-1234",
      cvss: "6.1",
      description: "Установлена устаревшая версия WordPress 6.4 с известными уязвимостями",
      solution: "Обновить WordPress до последней версии",
      scanner: "nuclei",
      templateId: "wordpress-outdated",
      matchedAt: "http://192.168.1.10/wp-admin/",
      status: "open",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: webHost.host.id,
      serviceId: httpsWeb.service.id,
      name: "WordPress xmlrpc.php Enabled",
      severity: "low",
      description: "XML-RPC интерфейс включен, возможны брутфорс атаки",
      solution: "Отключить xmlrpc.php или ограничить доступ",
      scanner: "nuclei",
      templateId: "wordpress-xmlrpc",
      matchedAt: "http://192.168.1.10/xmlrpc.php",
      status: "open",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: wsHost.host.id,
      serviceId: rdpWS.service.id,
      name: "Weak RDP Credentials",
      severity: "critical",
      description: "Обнаружены слабые учётные данные: admin/admin123",
      solution: "Сменить пароль на сложный, включить политику паролей",
      scanner: "hydra",
      proof: "Успешная авторизация: admin:admin123",
      status: "confirmed",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: dbHost.host.id,
      serviceId: sshDB.service.id,
      name: "OpenSSH < 8.0 Multiple Vulnerabilities",
      severity: "high",
      cve: "CVE-2019-6111",
      cvss: "7.5",
      cwe: "CWE-20",
      description: "Устаревшая версия OpenSSH 7.9 содержит множественные уязвимости",
      solution: "Обновить OpenSSH до версии 8.0 или выше",
      scanner: "nmap",
      templateId: "openssh-outdated",
      references: ["https://nvd.nist.gov/vuln/detail/CVE-2019-6111"],
      status: "open",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: routerHost.host.id,
      serviceId: telnetRouter.service.id,
      name: "Telnet Enabled - Cleartext Protocol",
      severity: "critical",
      cwe: "CWE-319",
      description: "Telnet передаёт данные в открытом виде, включая пароли",
      solution: "Отключить Telnet, использовать только SSH",
      scanner: "nmap",
      status: "confirmed",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: routerHost.host.id,
      serviceId: snmpRouter.service.id,
      name: "SNMP Default Community String",
      severity: "high",
      cwe: "CWE-798",
      description: "Используется стандартная community string 'public'",
      solution: "Изменить community string на сложную, ограничить доступ по IP",
      scanner: "nmap",
      templateId: "snmp-default-community",
      proof: "Community string: public",
      status: "open",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: fileHost.host.id,
      serviceId: ftpFile.service.id,
      name: "FTP Anonymous Login Allowed",
      severity: "high",
      cwe: "CWE-284",
      description: "Разрешён анонимный вход на FTP сервер",
      solution: "Отключить анонимный доступ или ограничить права",
      scanner: "nmap",
      templateId: "ftp-anon",
      proof: "Anonymous FTP login allowed",
      rawOutput: "21/tcp open  ftp Microsoft ftpd\n| ftp-anon: Anonymous FTP login allowed",
      status: "open",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: webHost.host.id,
      serviceId: httpsWeb.service.id,
      name: "Missing Security Headers",
      severity: "info",
      description: "Отсутствуют заголовки безопасности: X-Frame-Options, X-Content-Type-Options",
      solution: "Настроить security headers в nginx",
      scanner: "nuclei",
      templateId: "security-headers-detect",
      status: "open",
    },
    {
      projectId: demoProject.id,
      companyId: demoCompany.id,
      hostId: webHost.host.id,
      serviceId: httpsWeb.service.id,
      name: "TLS 1.0/1.1 Enabled",
      severity: "medium",
      description: "Поддерживаются устаревшие протоколы TLS 1.0 и 1.1",
      solution: "Отключить TLS 1.0/1.1, использовать только TLS 1.2/1.3",
      scanner: "testssl.sh",
      templateId: "ssl-old-tls",
      status: "open",
    },
  ]);

  console.log("Database seeded successfully with extended presets and vulnerabilities!");
}
