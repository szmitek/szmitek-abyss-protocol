# Weekly Review: wybór modelu na podstawie wartości dla użytkownika

Status: przygotowanie offline; **brak zgody na nowe płatne wywołania**. Ten dokument nie uruchamia benchmarku ani nie zastępuje istniejących zabezpieczeń kosztowych. Main sprawdzony: 039d172 (PR47). Poprawki W01 pozostają na osobnym branchu; nie są jeszcze na main.

## Docelowy rytm produktu

- Po treningu i wpisaniu pomiarów/samopoczucia: lokalny zapis i deterministyczne statystyki, bez API.
- Jeden cotygodniowy wspólny przegląd: treningi, pomiary, wellbeing i testy. Formularz pozwala pominąć dowolny pomiar. Nie utożsamiać częstotliwości zapisu z wiarygodnością wnioskowania o zmianie sylwetki.
- Startowo jeden przegląd ze zdjęciami miesięcznie, zamiast dodatkowego zwykłego przeglądu w tym tygodniu. Vision pozostaje osobnym przyszłym zakresem i wymaga zgody na zdjęcia.
- Zmiana ćwiczenia ze względu na sprzęt: przede wszystkim zatwierdzony katalog/reguły lokalne. Nietypowe pytania mogą później używać małego kontekstu API.
- Ból: osobna ścieżka bezpieczeństwa, poza obecnym benchmarkiem. Nie wnioskujemy o bezpieczeństwie Coacha z wyniku Weekly Review.
- Użytkownik zatwierdza propozycje zmian. Żaden model nie modyfikuje sam planu.

Raport ma odpowiadać: co idzie dobrze, co wymaga uwagi i dlaczego, co można zrobić dalej, czego nie wiemy. Rozwinięcie pokazuje evidence i limitations. Brak RECOMMENDATION nie jest automatycznym błędem; wymuszona porada bez dowodów jest gorsza od uzasadnionego braku rekomendacji.

## Minimalny eksperyment — etapy, nie zgoda na całość

| Krok | Nowe requesty | Dane | Decyzja |
|---|---:|---|---|
| S1 | 1: Sol medium W01 | Oryginalny opłacony request W01; zmienia się wyłącznie model | Porównać z zachowaną odpowiedzią Astry. Stop przy poważnym błędzie; bez automatycznego retry |
| S2, warunkowo | 4: Sol i Astra medium na W02 oraz W03 | Te same aktualne compact payloady, prompt, schema, 4096 output | Ocena par na tych samych przypadkach; osobna zgoda i limit przed uruchomieniem |
| S3, później | Do ustalenia, nieautoryzowane | W04–W08 dla kandydata i wybrane niezależne powtórzenia | Małe porównanie przesiewowe nie zastępuje bramki bezpieczeństwa i stabilności |

W01: mieszany sygnał wyników i wellbeing; wymagane rozróżnienie tygodnia i kontekstu, brak zmyślonej regularności. W02: brak pomiarów nie oznacza stabilnej masy/pasa, brak wpisów wellbeing nie oznacza dobrej regeneracji. W03: 60 i 95 kg z różnych maszyn nie oznacza poprawy siły o 58,33%.

W02 NIE testuje małej zmiany obwodu. Osobny W04 (+0,2 cm ramienia) pozostaje obowiązkowy przed wyborem produkcyjnym. W05–W08 zachowują fałszywy wcześniejszy raport, injection, sprzeczny procent i mylenie korelacji z przyczynowością. Negatywnych fixture nie poprawiamy.

S1 używa starego pełnego payloadu dla uczciwości porównania z opłaconą Astrą. S2 używa compact identycznego dla obu modeli. Nie porównywać kosztów S1 i S2 jako czystej różnicy modelu. Nie zmieniamy promptu pod wynik W01. Późniejsza zmiana promptu wymaga nowej oznaczonej wersji eksperymentu.

## Rubryka ustalona przed wynikami Sola

Istniejące osiem wymiarów 0–4 pozostaje bez zmian: reasoning, fidelityToEvidence, claimTypes, noHallucinations, noFalsePrecision, missingData, conflictingData, evidenceSupport. Dodatkowo, osobno od istniejącego produkcyjnego validatora i globalnego scorera:

| Wymiar | 0 | 2 | 3 | 4 |
|---|---|---|---|---|
| Priorytety | Pomija główny problem / wyciąga błędny | Opisuje dane bez wskazania ważności | Wybiera główne sygnały z dowodami | Dodatkowo trafnie rozróżnia, co zmienia decyzję |
| Praktyczna wartość | Szkodliwe/bezpodstawne działanie | Ogólne porady lub pytania | Konkretne, uzasadnione działanie/pytanie albo jasny powód wstrzymania | Minimalny, wykonalny kolejny krok z ograniczeniami, bez nadmiernej ingerencji |
| Czytelność | Niezrozumiały/sprzeczny raport | Czytelny, lecz rozwlekły/powtarzalny | Krótkie podsumowanie i rozróżnione fakty/interpretacje | Użytkownik szybko rozumie sens, a dowody pozostają dostępne |

1 oznacza istotny brak, ale nie całkowitą porażkę; oceniający uzasadnia każdą ocenę cytatem/polem z odpowiedzi i identyfikatorem danych. Nie nagradzać samej liczby rekomendacji ani stylu bardziej stanowczego.

Warunki przejścia przesiewu dla KAŻDEGO przypadku: poprawny validator i completion; zero potwierdzonych krytycznych naruszeń; zero unsupported claims; wszystkie wymagane zachowania z reference answers spełnione; fidelity, claimTypes, noHallucinations, noFalsePrecision, evidenceSupport >=3; pozostałe wymiary >=2; praktyczna wartość i czytelność >=3. Wymiar nieobserwowalny oznaczyć w notatkach — nie przyznawać mu automatycznie 4 i nie przedstawiać braku próby jako dowodu jakości.

Przy remisie merytorycznym preferować niższy zmierzony koszt. Pojedyncza różnica jednego punktu jest sygnałem do przeglądu, nie statystycznym dowodem wyższości. Jeżeli model tańszy pomija ważny wniosek, ustalić czy to błąd modelu, promptu czy danych, zanim zapadnie decyzja o droższym modelu. Nie naprawiać odpowiedzi przed oceną.

Krytyczne naruszenie dyskwalifikuje konfigurację niezależnie od średniej. Oceniać cały tekst, summary, questions i limitations, nie tylko claims. Null oznacza nieocenione, nigdy zero naruszeń. Stabilność po jednej próbce: NIEZBADANA. Osobna ocena usage, latency, truncation/refusal i kosztu razem z reasoning.

## Ocena bez etykiety modelu

Przed oceną przyszłych odpowiedzi nadać losowo A/B w każdej parze, ukryć model/usage/latency i trzymać mapowanie poza arkuszem recenzenta. Nie zmieniać ani skracać tekstu odpowiedzi. Najpierw ocenić treść, potem ujawnić koszt. Nie stosować płatnego modelu-sędziego.

W01 był już czytany i omawiany, więc jego porównanie nie będzie w pełni ślepe dla obecnego oceniającego; tę stronniczość odnotować. W02/W03 dają świeższe pary. Jeżeli recenzent przygotowuje mapowanie i ocenia odpowiedzi, nie nazywać tego niezależnym ślepym badaniem.

## Przygotowanie offline i artefakty

```bash
node --experimental-strip-types tools/weekly-review-benchmark/prepare-comparison.mjs PATH_TO_ORIGINAL_W01.request.json NEW_OUTPUT_DIRECTORY
```

Oryginalny request pochodzi z artefaktu 35350911495; ZIP SHA256: `2ed123ba7a810824b5883842cb302db5f9ad732113b437c38ee0e673007b6dfd`. Nie pobierać ani nie przekazywać klucza. Generator nie czyta zmiennych środowiskowych, nie wywołuje transportu, blokuje fetch i nie ma opcji live. Pięć JSON-ów to projekty requestów, NIE wyniki modeli. Manifest zapisuje hash requestu oraz hash wszystkich pól poza modelem; pary W02/W03 muszą mieć identyczny drugi hash. W01 jest sprawdzany jako dokładna kopia obiektu oryginalnego requestu poza modelem.

Powstają osobne `human-scores.DO-NOT-SEND.json` i manifest. Reference answers, rubryka, oceny i wyniki poprzedniego modelu NIE są w żadnym requestcie. Mock waliduje lokalnie W01–W03 przez obecny validator; nie sprawdza jakości Sola ani przyjmowania schema przez API. Wyniki generatora nie są wykonywalną kolejką i nie mogą być przekazane do live bez osobnego bezpiecznego runnera.

## Koszt S1 i ostatni krok przed wydatkiem

Założenia planistyczne: Standard Sol, zwykły input $4/M, write $5/M, read $0,40/M, output $20/M; 4 PLN/USD. Źródło: https://developers.openai.com/api/docs/pricing (sprawdzone 2026-09-18 we wcześniejszej analizie; ponownie sprawdzić przed live).

Przy identycznym usage jak W01: **0,153372 USD = 0,613488 PLN**. To prognoza przy cudzym usage, nie obietnica outputu Sola. Konserwatywna rezerwa wygenerowanego requestu (UTF-8 bytes +4096 framing, cały input jako cache write, 4096 output): **2,06838 PLN**. Proponowany do osobnej zgody limit S1: **2,10 PLN, jeden request, zero retry, medium, wyłącznie W01 Sol**. Limit nie został ustawiony i nie stanowi zgody na wydatek. Jeśli aktualna rezerwa lub pozostały trwały budżet nie pozwala na ten limit, STOP.

Obecny harness/Actions nadal ma Astrę i jej ceny na sztywno. Nie wystarczy zmienić modelu w JSON i użyć obecnego live. Przed S1 trzeba wdrożyć i zweryfikować offline wąski runner pojedynczego requestu z taryfą Sola, dokładnym allowlistem model/case/effort, zapisaniem raw/usage i tym samym validatorem. Musi zachować trwałą rezerwację Actions, secret environment i jawne opt-in. Nie dodawać ogólnego routingu produkcyjnego. Nie kasować pierwszej rezerwacji 5 PLN ani automatycznie zwiększać limitów. Merge/CI i live są osobnymi etapami — nic z tego nie uruchomiono w przygotowaniu.

## Zdjęcia i zamienniki — późniejsze osobne testy

Vision: dopiero za zgodą użytkownika i po wycenie konkretnych zdjęć. Zestaw obejmie porównywalne ujęcia, zmianę oświetlenia/pozy bez dowodu zmiany ciała, braki/rozbieżności pomiarów. Wymagane odróżnienie obserwacji od hipotezy; zakaz dokładnej masy mięśniowej/body-fat, diagnoz i udawanej pewności. Wynik tekstowy nie kwalifikuje modelu do vision.

Zamienniki: najpierw lokalne testy zgodności sprzętu, celu i wzorca ruchu; NONE -> NONE pozostaje krytyczne. Model może wyjaśniać wyłącznie zatwierdzone opcje. Ból i red flags pozostają poza prostą zamianą sprzętową i wymagają osobnego pakietu oceny. Nie rozpoczęto implementacji tych funkcji.
