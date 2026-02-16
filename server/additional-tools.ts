import { db } from "./db";
import { tools } from "@shared/schema";
import { eq } from "drizzle-orm";

const additionalTools = [
  { name: "hping3", description: "Генератор пакетов и сканер портов", commandTemplate: "hping3 -S $IP -p 80", category: "scanner" },
  { name: "arping", description: "ARP ping для обнаружения хостов", commandTemplate: "arping -c 3 $IP", category: "scanner" },
  { name: "fping", description: "Параллельный ping нескольких хостов", commandTemplate: "fping -a -g $IP", category: "scanner" },
  { name: "wafw00f", description: "Обнаружение веб-фаерволов (WAF)", commandTemplate: "wafw00f http://$IP", category: "web" },
  { name: "wapiti", description: "Сканер уязвимостей веб-приложений", commandTemplate: "wapiti -u http://$IP", category: "web" },
  { name: "skipfish", description: "Активный сканер безопасности веб-приложений", commandTemplate: "skipfish -o output http://$IP", category: "web" },
  { name: "fierce", description: "DNS-разведка и обнаружение поддоменов", commandTemplate: "fierce --domain $IP", category: "recon" },
  { name: "dnsrecon", description: "DNS-перечисление и разведка", commandTemplate: "dnsrecon -d $IP", category: "recon" },
  { name: "dnsenum", description: "Перечисление DNS-записей", commandTemplate: "dnsenum $IP", category: "recon" },
  { name: "sublist3r", description: "Быстрое перечисление поддоменов", commandTemplate: "sublist3r -d $IP", category: "recon" },
  { name: "nbtscan", description: "NetBIOS сканирование", commandTemplate: "nbtscan $IP", category: "ad_enum" },
  { name: "smbmap", description: "Перечисление SMB-ресурсов", commandTemplate: "smbmap -H $IP", category: "ad_enum" },
  { name: "ldapsearch", description: "Поиск в LDAP-каталоге", commandTemplate: "ldapsearch -x -H ldap://$IP -b 'dc=domain,dc=local'", category: "ad_enum" },
  { name: "sslscan", description: "Тестирование SSL/TLS настроек", commandTemplate: "sslscan $IP", category: "web" },
  { name: "sslyze", description: "Анализ SSL-конфигурации", commandTemplate: "sslyze --regular $IP", category: "web" },
  { name: "medusa", description: "Параллельный брутфорсер паролей", commandTemplate: "medusa -h $IP -u admin -P passwords.txt -M ssh", category: "bruteforce" },
  { name: "ncrack", description: "Высокоскоростной сетевой взломщик паролей", commandTemplate: "ncrack -p 22 --user admin -P passwords.txt $IP", category: "bruteforce" },
  { name: "patator", description: "Многоцелевой брутфорсер", commandTemplate: "patator ssh_login host=$IP user=admin password=FILE0 0=passwords.txt", category: "bruteforce" },
  { name: "msfconsole", description: "Metasploit Framework консоль", commandTemplate: "msfconsole -q -x 'search $IP'", category: "exploit" },
  { name: "msfvenom", description: "Генератор полезных нагрузок Metasploit", commandTemplate: "msfvenom -p linux/x86/shell_reverse_tcp LHOST=$IP LPORT=4444 -f elf", category: "exploit" },
  { name: "wget", description: "Загрузка файлов из сети", commandTemplate: "wget -q -O - http://$IP/robots.txt", category: "web" },
  { name: "host", description: "DNS-lookup утилита", commandTemplate: "host $IP", category: "recon" },
  { name: "nslookup", description: "DNS-запросы", commandTemplate: "nslookup $IP", category: "recon" },
  { name: "dnsmap", description: "DNS-брутфорс поддоменов", commandTemplate: "dnsmap $IP", category: "recon" },
  { name: "aircrack-ng", description: "Взлом WEP/WPA ключей", commandTemplate: "aircrack-ng -w wordlist.txt capture.cap", category: "wireless" },
  { name: "airodump-ng", description: "Перехват WiFi пакетов", commandTemplate: "airodump-ng wlan0mon", category: "wireless" },
  { name: "aireplay-ng", description: "Инъекция WiFi пакетов", commandTemplate: "aireplay-ng -0 10 -a BSSID wlan0mon", category: "wireless" },
  { name: "wifite", description: "Автоматизированный взлом WiFi", commandTemplate: "wifite", category: "wireless" },
  { name: "snmpwalk", description: "Получение SNMP-данных", commandTemplate: "snmpwalk -v 2c -c public $IP", category: "recon" },
  { name: "snmpcheck", description: "Перечисление SNMP", commandTemplate: "snmpcheck -t $IP", category: "recon" },
  { name: "onesixtyone", description: "Быстрый SNMP сканер", commandTemplate: "onesixtyone -c communities.txt $IP", category: "recon" },
  { name: "theHarvester", description: "OSINT сбор email и поддоменов", commandTemplate: "theHarvester -d $IP -b google", category: "recon" },
  { name: "recon-ng", description: "Фреймворк для веб-разведки", commandTemplate: "recon-ng", category: "recon" },
  { name: "spiderfoot", description: "Автоматизация OSINT", commandTemplate: "spiderfoot -s $IP", category: "recon" },
  { name: "tcpdump", description: "Анализатор сетевого трафика", commandTemplate: "tcpdump -i any host $IP -n", category: "network" },
  { name: "tshark", description: "Терминальный Wireshark", commandTemplate: "tshark -i any host $IP", category: "network" },
  { name: "netdiscover", description: "ARP-разведка сети", commandTemplate: "netdiscover -r $IP/24", category: "scanner" },
  { name: "arp-scan", description: "Сканирование ARP", commandTemplate: "arp-scan $IP/24", category: "scanner" },
  { name: "p0f", description: "Пассивное определение ОС", commandTemplate: "p0f -i any", category: "recon" },
  { name: "hash-identifier", description: "Идентификация типа хеша", commandTemplate: "hash-identifier", category: "bruteforce" },
  { name: "hashid", description: "Определение типа хеша", commandTemplate: "hashid hash.txt", category: "bruteforce" },
  { name: "cewl", description: "Генерация словаря из сайта", commandTemplate: "cewl http://$IP -w wordlist.txt", category: "web" },
  { name: "crunch", description: "Генератор словарей", commandTemplate: "crunch 8 8 abcdef -o wordlist.txt", category: "bruteforce" },
  { name: "weevely", description: "Веб-шелл для пост-эксплуатации", commandTemplate: "weevely generate password shell.php", category: "exploit" },
  { name: "hciconfig", description: "Настройка Bluetooth-адаптера", commandTemplate: "hciconfig", category: "wireless" },
  { name: "hcitool", description: "Bluetooth-инструменты", commandTemplate: "hcitool scan", category: "wireless" },
  { name: "btscanner", description: "Bluetooth-сканер", commandTemplate: "btscanner", category: "wireless" },
  { name: "responder", description: "LLMNR/NBT-NS/MDNS отравитель", commandTemplate: "responder -I eth0", category: "ad_enum" },
  { name: "bettercap", description: "Швейцарский нож для сетевых атак", commandTemplate: "bettercap -iface eth0", category: "network" },
  { name: "exiftool", description: "Чтение/запись метаданных файлов", commandTemplate: "exiftool file.jpg", category: "recon" },
];

export async function seedAdditionalTools() {
  for (const tool of additionalTools) {
    const existing = await db.select().from(tools).where(eq(tools.name, tool.name));
    if (existing.length === 0) {
      await db.insert(tools).values({
        name: tool.name,
        description: tool.description,
        commandTemplate: tool.commandTemplate,
        isBuiltIn: true,
        category: tool.category,
      });
    }
  }
  console.log(`Added ${additionalTools.length} additional tools to database`);
}
