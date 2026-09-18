# W01 — post-mortem i naprawa benchmarku (bez nowego API)

Stan: 18 września 2026. Pierwszy run: 35350911495, commit main 039d1727a4cc92c7efac891d5d17d5403a4b39c2. Artefakt użytkownika ma SHA-256 `2ed123ba7a810824b5883842cb302db5f9ad732113b437c38ee0e673007b6dfd`, zgodny z GitHub. Nie modyfikowano oryginalnego ZIP, surowej odpowiedzi ani historycznego wyniku. Niniejszy dokument stanowi jawną korektę rachunku.

## 1. Wynik i przyczyna kosztu

Wykonano jedno zapytanie W01, Astra medium: HTTP 200, completed, walidacja progress-review.v1 OK, latency 36,757830448 s. Pozostałe W02–W08 nie zostały wysłane. Oceniono osiem claims W01: brak wykrytych krytycznych naruszeń, niepopartych claims i błędów walidacji. Nie jest to zaliczenie całej konfiguracji ani dowód stabilności.

Koszt powstał przede wszystkim z 21 979 tokenów inputu, w tym 21 976 zapisanych do cache. Input wraz z zapisem kosztował 0,27473 USD (71,65% rachunku). Output kosztował 0,10870 USD (28,35%). Reasoning to tylko 86 tokenów i 0,00430 USD zawarte w koszcie outputu. Nie odpowiada za wysoki rachunek.

## 2. Poprawiony rachunek

Stawki Standard/short context za milion tokenów: ordinary input $10, cache write $12,50, cache read $1, output $50. Kurs konfiguracyjny **4 PLN/USD**, bez VAT/opłat płatniczych i bez twierdzenia o bieżącym kursie rynkowym.

| Składnik | Tokeny | USD | PLN |
|---|---:|---:|---:|
| Ordinary input | 3 | 0,00003 | 0,00012 |
| Cache write | 21 976 | 0,27470 | 1,09880 |
| Cache read | 0 | 0 | 0 |
| Output łącznie | 2 174 | 0,10870 | 0,43480 |
| **Razem** | **24 153** | **0,38343** | **1,53372** |

86 reasoning tokens jest podzbiorem outputu; pozostałe 2088 to output bez reasoning. Nie dodajemy reasoning ponownie. Rachunek: `(3×10 + 21976×12.5 + 0×1 + 2174×50)/1e6` USD. To koszt wynikający z rzeczywistego usage i cennika, nie odczyt faktury/konta.

Stary kalkulator traktował cache writes jako ordinary input i raportował 0,32849 USD / 1,31396 PLN. Zaniżenie: **0,05494 USD / 0,21976 PLN**. Odpowiedzialność za błąd leży w przygotowanym harnessie, nie modelu.

Naprawa: osobne ordinary/write/read/output oraz breakdownUsd. Brak liczników cache w niezerowym input, niespójne sumy, nieznany model/tier lub przekroczenie obsługiwanego progu short context nie dają pozornego kosztu zero — zachowują rezerwację i zatrzymują sesję. Tier Standard jest jawny. Nie zmieniono stawek/limitu dla aplikacji mobilnej, bo jej integracja nadal jest mockiem.

## 3. Skąd tokeny inputu

Lokalnie użyto **tiktoken 0.14.0, o200k_base**. Biblioteka nie ma mapowania `gpt-6-astra`; jest to jawny proxy, nie dokładna tokenizacja Astry. Sam tekst wiadomości i schema dają 22 165 tokenów proxy wobec 21 979 raportowanych przez API: różnica 186 (0,85%). Nie nazywamy tej różnicy dokładnym narzutem serwera. Nie użyto endpointu liczącego tokeny ani modelu. Szczegóły: [W01_TOKEN_AUDIT.json](W01_TOKEN_AUDIT.json), skrypt `tools/weekly-review-benchmark/analyze_payload.py`.

| Główny składnik | Tokeny proxy | Udział w lokalnym oszacowaniu |
|---|---:|---:|
| System prompt | 395 | 1,8% |
| Response JSON schema | 425 | 1,9% |
| Snapshot wraz z historią | 12 553 | 56,6% |
| Evidence registry | 8 787 | 39,6% |
| Opakowanie wiadomości user | ok. 5 | <0,1% |
| **Suma** | **22 165** | **100%** |

Rozbicie snapshotu (wartości zagnieżdżone, nie dodawać ponownie do powyższej tabeli):

| Dane | Tydzień | Historia 4 tygodni | Razem |
|---|---:|---:|---:|
| Fakty policzone przez aplikację | 2472 | 2870 | 5342 |
| Treningi i serie/exposures | 546 | 1978 | 2524 |
| Wellbeing | 210 | 825 | 1035 |
| Pomiary i ich statystyki | 936 | 2165 | 3101 |
| Testy ruchowe | 86 | 86 | 172 |
| Pozostałe klucze/metadane/opakowanie | — | — | ok. 379 |

W system prompt około 173 tokenów to akapity o niezaufanych danych, własności obliczeń i ograniczeniach bezpieczeństwa; około 221 to zakres, format claims i status odpowiedzi, plus separatory. To części istniejących 395 tokenów, nie dodatkowy koszt. Definicje kontraktu są w tych instrukcjach i schema; nie wysyłamy kodu TypeScript ani raportu AI v2. Nie wysyłamy katalogu ćwiczeń: występują jedynie identyfikatory i parametry wykonanych ćwiczeń. Nie wysyłamy zdjęć, tylko mały pusty manifest/status.

W01 rzeczywiście analizuje tydzień 7–13 września i kontekst 17 sierpnia–13 września. Fixture bazowa ma sześć tygodni, ale API nie dostało sześciu pełnych tygodni ani osiemdziesięciu tysięcy tokenów: 87 035 było dawnym sufitem UTF-8 bytes + narzut, nie wynikiem tokenizacji.

## 4. Duplikacja, redukcje i ryzyka

| Kandydat | Oszczędność proxy W01 | Ryzyko i evidence tracing | Decyzja |
|---|---:|---|---|
| Usunąć `title` i `detail` z evidence registry | **4691** | Opisy powtarzają wartości/method z snapshotu. Zachowujemy wszystkie id, kind, sourceIds, available i canonicalFactText. Mniejsza redundancja może wpłynąć na zachowanie modelu; potrzebna późniejsza ocena jakości. | Wdrożono opcjonalne `--payload=compact`; snapshot pozostaje identyczny. |
| Zastąpić rekordy tygodnia powtórzone w historii odwołaniami | ok. 1158 | Usunięcie bez jawnego mechanizmu referencji błędnie zmieni historię i coverage. Potrzebny nowy kontrakt transportu i testy rekonstrukcji. | Tylko propozycja, nie wdrożono. |
| Wynieść powtarzane `fact.period` do wspólnego scope | ok. 1818 | Trzeba zachować różne okresy week/history i precyzyjne pochodzenie faktów. | Tylko propozycja, nie wdrożono. |
| Usunąć fakty null lub ich evidence entries | nie wyceniano jako zaakceptowanej redukcji | Brak może przestać być odróżniany od zera/dobrego wyniku; zmiana coverage i dostępności. | Zachowano. |
| Usunąć surowe serie/pomiary pozostawiając same agregaty | potencjalnie tysiące | Model nie wykryje niespójności W07, różnic maszyn ani pułapek metody pomiarowej; evidence traci źródła. | Odrzucono. |
| Skrócić schema/instrukcje bezpieczeństwa | mało: całe schema to 425 | Utrata ograniczeń formatu, klas claims lub ochrony przed injection. | Zachowano. |

Nie dodawać mechanicznie oszczędności kandydatów — mogą się nakładać. Statystyki i fakty często opisują te same pomiary, ale pełnią inną rolę: aplikacja dostarcza policzone fakty, a źródła pozwalają weryfikować ich interpretację. Zachowano również celowo błędne fixture W05–W08. Testy porównują snapshot przed/po kompakcji dla wszystkich ośmiu przypadków.

## 5. Cache: obserwacja i wniosek

Harness nie ustawił `prompt_cache_options`, breakpointów ani `prompt_cache_key`. Wysyłał standardowe Responses HTTP; nie ma SDK włączającego cache. Prawie pełny cache write odpowiada domyślnemu mechanizmowi implicit, który umieszcza breakpoint na końcu ostatniej kwalifikującej się wiadomości user. Prawie cały prefix (instrukcje/schema/dane) został zapisany; API nie raportuje osobnego podziału cache na te składniki. `store:false` nie oznacza wyłączonego prompt cache.

Dokumentacja GPT-5.6+ podaje domyślny TTL minimum 30 minut od zapisu/ponownego użycia; dostawca może przechowywać dłużej. Raw odpowiedź W01 zawiera również legacy `prompt_cache_retention:24h`; nie traktujemy tego jako gwarancji tygodniowego reuse ani zastępstwa aktualnego modelowego kontraktu cache.

**A. Krótka sesja benchmarku:** identyczny prefix może się opłacić już przy jednym ponownym użyciu, ale W01–W08 różnią się requestId wcześnie w wiadomości user i zmienionymi danymi. Sam podobny początek nie gwarantuje trafienia przy obecnym implicit breakpoincie na końcu wiadomości. Stałe system+schema mają tylko około 820 tokenów proxy, poniżej dokumentowanego minimum 1024; nie dopisujemy pustego tekstu, aby wymusić cache. Opcją do osobnej konfiguracji jest explicit-only bez breakpointów dla deterministycznego cold baseline albo explicit breakpoint na rzeczywiście wspólnym, wystarczająco dużym kontekście. Druga opcja wymaga osobnego projektu transportu i porównania jakości. Nie zakładamy żadnego rabatu cache w rezerwie.

**B. Produkcja raz w tygodniu:** zmieniają się dane, a interwał jest daleko poza minimalną retencją. Nie ma podstaw planować oszczędności z reuse pełnego snapshotu. Rekomenduję rozważyć explicit-only bez breakpointów dla takich pojedynczych analiz; oszczędność W01 bez write wyniosłaby 0,21976 PLN. Nie zmieniłem automatycznie polityki cache w tym pakiecie. Model wciąż będzie interpretował pełne potrzebne dane, niezależnie od cache.

## 6. Scenariusze kosztu — jawne założenia

USD→PLN zawsze ×4. Powtarzanie W01 to scenariusz, nie prognoza gwarantowana dla innych użytkowników. Scenariusze Luna/Vision są wyłącznie arytmetyczne; żaden taki model ani obraz nie został uruchomiony.

| Scenariusz | USD | PLN |
|---|---:|---:|
| A: jeden W01, rzeczywiste usage | 0,38343 | 1,53372 |
| B: cztery analizy jak W01, cold writes | 1,53372 | 6,13488 |
| C: B + 10 prostych zadań Luna | 1,54472 | 6,17888 |
| D: B + jedna planistyczna analiza Vision | 1,99622 | 7,98488 |
| E: jeden W01 bez cache write | 0,32849 | 1,31396 |
| E: cztery W01 bez cache write | 1,31396 | 5,25584 |
| F: jeden compact, cold write, output jak W01 | ok. 0,32479 | ok. 1,29917 |
| F: cztery compact, cold write | ok. 1,29917 | ok. 5,19668 |
| F+E: jeden compact bez write | ok. 0,28158 | ok. 1,12632 |
| F+E: cztery compact bez write | ok. 1,12632 | ok. 4,50528 |

C: 10 zadań po 2000 input i 500 output, wszystko cold write; Luna Standard $0,25/M write i $1,20/M output. Nie dowodzi to jakości Luny. D: 20 000 tekstowych + 5000 rozliczanych tokenów obrazu, 3000 output, wszystko cold write na Astrze. Tokeny obrazu są arbitralnym budżetem planistycznym, nie przeliczeniem liczby zdjęć. Faktyczny koszt zależy od modelu, rozdzielczości i detail. F: przybliżone 17 288 input = W01 minus 4691 proxy tokenów; zmiana tokenizacji i odpowiedzi może zmienić wynik.

| Całkowity output | Jeden review USD | Jeden review PLN | 4 review USD | 4 review PLN |
|---|---:|---:|---:|---:|
| 1× = 2174 | 0,38343 | 1,53372 | 1,53372 | 6,13488 |
| 2× = 4348 | 0,49213 | 1,96852 | 1,96852 | 7,87408 |
| 3× = 6522 | 0,60083 | 2,40332 | 2,40332 | 9,61328 |

Warianty 2×/3× przekraczają obecny limit 4096 output: to analiza wrażliwości, nie konfiguracja do uruchomienia. Limitu nie podniesiono.

## 7. Budżety i routing

5 PLN soft budget nie pokrywa czterech obecnych review (6,13 PLN); po samej wdrożonej kompakcji nadal około 5,20 PLN. Jako alarm pozostaje poprawny, lecz nie jako realistyczny miesięczny plan czterech analiz. Rekomendacja do decyzji: **soft 8 PLN, global hard 10 PLN** dla jednej osoby, z możliwością świadomego zatrzymania przy dłuższych odpowiedziach/vision. Nie zmieniono aktualnych 5/10 ani sesyjnych 5 PLN. Zgłoszony limit konta $2 (~8 PLN przy tym kursie) pozostaje osobną niższą barierą i wymaga uwzględnienia przed planowaniem wydatków blisko 10 PLN; nie zmieniano go.

Static Routing nadal jest sensowny dla częstych prostych zadań. Dla identycznych planistycznych 10×(2000 input cold write +500 output) Astra kosztowałaby 2 PLN, Luna 0,044 PLN. Oszczędność 1,956 PLN nie stanowi dowodu równoważnej jakości ani zgody na integrację Luny. Przy samym Weekly Review drugi model nie jest potrzebny.

## 8. Rezerwacja i możliwość kontynuacji

Pierwotnie: 1,31396 PLN zaksięgowane + 3,77948 PLN rezerwy W02 = 5,09344 >5. Rezerwa obejmowała maksymalny output, ale input był liczbą bajtów serializacji +4096, nie tokenizacją. Była mocno konserwatywna co do liczby tokenów i jednocześnie błędna cenowo, bo nie uwzględniała cache write. To dwa oddzielne problemy.

Naprawiona rezerwa nadal jest konserwatywnym sufitem bajtowym i stosuje najdroższy input w obsługiwanym Standard (cache write), pełne 4096 output i zero domniemanych cache hits. Nie zastąpiono jej średnią z W01: średnia nie chroni hard cap. Lokalny proxy tokenizer służy do planowania, nie do deklarowania gwarantowanej górnej granicy Astry.

Wdrożono redukcję rzeczywistego payloadu jako opcję i `preflight.json`: koszt maksymalny każdego zapytania, całego planu oraz informację, czy plan mieści się w limicie. Przy zatrzymaniu powstaje `budget-stop.json` z identyfikatorem niewysłanego przypadku, rezerwą i pozostałym budżetem. Osobno raportowane jest actual usage; brak usage zachowuje rezerwację i zatrzymuje. Trwałego journalu z rezerwacją pierwszych 5 PLN nie zmieniono i nie zwrócono jej automatycznie.

Dla nowego transportu compact, medium, 4096 output, ×4 PLN/USD:

| Case | Rezerwa PLN |
|---|---:|
| W02 | 3,74625 |
| W03 | 4,82070 |
| W04 | 4,33990 |
| W05 | 4,27070 |
| W06 | 4,26950 |
| W07 | 4,29525 |
| W08 | 4,26915 |
| **Suma górnych oszacowań** | **30,01145** |

To nie prognoza rachunku: orientacyjnie siedem compact przy kosztach podobnych do W01 kosztowałoby **9,09 PLN**, z nieznanym cache reuse i różnym outputem. Pod obecnym limitem kolejna osobno zatwierdzona sesja nadal ma maksymalnie **5 PLN** i prawdopodobnie nie wykona wszystkich siedmiu przypadków. Sam maksymalny output siedmiu zapytań kosztuje 5,7344 PLN nawet przy zerowym input.

Bezpieczny kierunek dalszy: jawne planowanie mniejszych partii albo zatwierdzenie budżetu pasującego do całego zestawu; alternatywnie dopiero zatwierdzona redukcja limitu output po ocenie truncation. Nie ograniczamy odpowiedzi i nie zakładamy cache hits po cichu. Dokładniejszy, potwierdzony tokenizer modelu mógłby zawęzić rezerwę z narzutem, ale obecne o200k_base nim nie jest. Siedmiu wyników w 5 PLN nie można obiecać po kosmetycznej korekcie estymatora.

## 9. Jakość i praktyczna wartość W01

Dwa FACT kopiują kanoniczne fakty; sześć OBSERVATION ma poparcie. Rozróżnienie tygodnia i historii, nieznana regularność, mieszany progres/sen/energia, brak wnioskowania o mięśniach i samoopisowy charakter testów odpowiadają kryteriom W01. Brak zmyślonej diagnozy, zdjęć, procentów confidence i automatycznych zmian planu. Wszystkie osiem źródłowych wniosków ma pokrycie w danych; brak rekomendacji nie jest błędem schema.

Praktyczna wartość: raport ujawnia, że rzeczywista objętość przekracza zapisaną receptę, końcowe serie są too-hard, a gorszy sen/energia trwały już wcześniej. Trafne pytania pomagają ustalić, czy problemem jest zapis, dobór trudności czy kontekst regeneracji. Jest jednak bardziej audytem niż krótkim przewodnikiem, co zrobić dalej.

2174 output obejmuje 86 reasoning, 2088 JSON/tekstu. Nie ma dowodu, że dokładnie ta długość jest potrzebna. Powtarzają się zastrzeżenia o braku fizjologicznych wniosków i brakach danych. Można docelowo celować w 4–6 priorytetowych claims, krótsze limitations i 1–2 ostrożne rekomendacje tylko tam, gdzie evidence to uzasadnia, bez obniżania coverage. Przykładem ogólnego działania byłoby zweryfikowanie rozbieżności plan–zapis przed dalszą progresją, bez automatycznej zmiany planu. Nie wymuszamy rekomendacji przy niewystarczających danych.

Nie znamy wewnętrznego powodu, dla którego model nie wybrał RECOMMENDATION. Prompt zezwala, lecz jej nie wymaga, a brak zmian planu i nacisk na ostrożność sprzyjają pytaniom. Nie dostrojono promptu pod jeden przykład ani nie obniżono output cap. Późniejsze porównanie powinno ocenić użyteczność obok walidacji. High nie jest uzasadnione tym jednym poprawnym przypadkiem.

## 10. Dostawa i gotowość

Zmiany dotyczą wyłącznie narzędzi developerskich, dokumentacji i testów; zero zmian domeny/UI/AIProvider aplikacji. Dodatkowe wywołania modeli: **0**, dodatkowy koszt AI: **0 PLN**. Nie wykonywano CI, Android build, live, retry, high, Luny ani Vision. Weryfikacja lokalna: **243 testy zaliczone, 0 błędów**, TypeScript i lint poprawne; dry-run full W01–W08: **8/8**, compact W02–W08: **7/7**, oba 0 PLN. `git diff --check` poprawny. Zmieniono przyszły ręczny workflow na remaining/compact, zachowując allow_paid=NO jako domyślne i wszystkie limity; niczego nie uruchomiono.

Harness jest lokalnie przygotowany do bezpiecznej, częściowej kontynuacji W02–W08 po osobnej zgodzie, ale nie do zagwarantowania pełnych siedmiu wyników w 5 PLN. Kompaktowy transport ma nową wersję `evidence-index.v2`; stare W01 full.v1 jest punktem odniesienia, nie bezpośrednio równoważnym pomiarem jakości nowego wariantu. Publikacja do main i CI również pozostają poza tym lokalnym etapem weryfikacji.

## Źródła

- https://developers.openai.com/api/docs/pricing — stawki Astra/Luna Standard, cache write.
- https://developers.openai.com/api/docs/guides/prompt-caching — implicit/explicit, minimum 1024, ttl 30m, wyliczenie usage.
- Oryginalny ZIP użytkownika: W01 request/raw/result/summary; kod main po PR47.
