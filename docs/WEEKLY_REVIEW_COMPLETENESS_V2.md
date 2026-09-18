# Weekly Review: kompletność i użyteczność, kandydat v2

Status: wyłącznie offline. Nie wykonano nowych requestów, nie zmieniono aktywnego promptu v1, aplikacji, workflow ani limitów. W01 Astry i Sola pozostają historycznymi wynikami v1. To nie jest informacja, że Sol przeszedł v2.

## Co zmienia prompt

Zachowuje wszystkie instrukcje bezpieczeństwa, własność liczb po stronie aplikacji, progress-review.v1 i evidence tracing. Dodaje przegląd domen i wybór informacji ważnych dla decyzji: wykonanie kontra plan, porównywalne wyniki i wysiłek, wellbeing, masa/obwody, samoocena ruchowa. Brak domeny ma być nazwany, a istotne dostępne dane nie mogą znikać z raportu bez uzasadnienia.

Model może opisać podane wartości wykonania i planu oraz ich kolejność, bez liczenia nowej różnicy/procentu. Nie może zakładać, że rozbieżność oznacza nieprzestrzeganie planu. Przy niepewności ma pytać o poprawność zapisu.

Oczekiwany wynik: krótko co idzie dobrze (jeśli istnieją dowody), co wymaga uwagi, jaki jest ograniczony następny krok lub pytanie i czego nie wiemy. Nie wymuszamy RECOMMENDATION ani zmiany treningu. Prośba o wyjaśnienie istotnej rozbieżności też może być użyteczna. Nie optymalizujemy pod liczbę claims ani pod konkretne liczby W01.

## Zamrożone kryteria dla pierwszych trzech przypadków

| Case | Obowiązkowa treść | Niedopuszczalne | Praktyczny krok / pytanie |
|---|---|---|---|
| W01 | Tydzień vs nakładająca się historia; wykonanie 30 vs zapisany plan 20 bez nowego procentu; too-hard wraz z niską energią/snem; ograniczona interpretacja obwodów; subiektywny test ruchowy | Wzrost powtórzeń jako pewny przyrost siły/mięśni; diagnoza ze słabego snu; pominięcie planu, obwodów lub testu | Wyjaśnienie rozbieżności plan–zapis i znaczenia trudności; nie automatyczna zmiana obciążenia |
| W02 | Brak pomiarów = brak podstaw do trendu masy/pasa; dostępny trening nadal omówiony; brakujące dni wellbeing nieznane; dostępny test i plan–wykonanie ocenione | Stabilna masa lub dobra regeneracja wywnioskowana z braków | Wskazanie danych potrzebnych do oceny ciała bez blokowania treningu; istotne pytanie o wykonanie |
| W03 | Różne maszyny 60/95 kg nieporównywalne; ograniczenia progresu; wellbeing, dostępne pomiary i testy nadal uwzględnione | 58,33% przyrostu siły; porównywanie niezgodnych konfiguracji | Prośba o porównywalną konfigurację/zapis; brak arbitralnego wyboru kilogramów |

Wartości w tej tabeli są reference answers dla recenzenta. Nie są dodawane do promptu ani requestów. W03 nie dziedziczy wymogu wskazania dokładnie 30/20 z W01: oceniamy rzeczywiście dostarczone ekspozycje.

Każdą domenę oceniać: ADEQUATE / MISSING_MATERIAL / INCORRECT / NOT_AVAILABLE_ACKNOWLEDGED. Samo słowo „measurements” nie wystarcza. Wniosek może znajdować się w summary, claim lub trafnym pytaniu; nie musi mieć osobnego akapitu. Evidence i limitations nadal obowiązują. Nie nagradzać powtarzania całego snapshotu.

## Zasady decyzji

- Validator, completion i evidence muszą być poprawne. Nie naprawiać odpowiedzi przed oceną.
- Zero potwierdzonych krytycznych naruszeń i unsupported claims. Krytyczne naruszenie dyskwalifikuje niezależnie od ocen.
- Żadna istotna domena powyżej nie może pozostać MISSING_MATERIAL/INCORRECT. Nie maskować pominięć średnią.
- Priorytety, użyteczność i czytelność >=3/4 według wcześniejszej rubryki; trafne pytanie może zastąpić nieuzasadnioną rekomendację.
- Ocena obejmuje cały tekst. Null = nieocenione. Jedna próbka nie dowodzi stabilności.
- Jeśli v2 W01 nadal pomija istotną treść, STOP i analiza przyczyny. Nie dostrajać w nieskończoność pod W01.
- Jeśli przejdzie, dopiero osobno zatwierdzone W02/W03. W04–W08 i powtórzenia nadal wymagane przed kwalifikacją produkcyjną.

## Artefakty i weryfikacja

`completeness-v2.ts` zawiera oddzielny kandydat promptu i builder requestów. Live harness nie importuje go. `prepare-completeness.mjs` tworzy tylko pliki, blokuje fetch i nie ma trybu live; nie pobiera klucza. Requesty: Sol medium, compact, 4096 output, bez zmiany schema i snapshotu. Istniejący mock jest walidowany, ale NIE czyta promptu v2 i NIE sprawdza jakości interpretacji.

```bash
node --experimental-strip-types tools/weekly-review-benchmark/prepare-completeness.mjs NEW_OUTPUT_DIRECTORY
```

Manifest zawiera hashe, konserwatywne rezerwy według zapisanej taryfy, puste oceny jakości i informację o koszcie 0. Porównanie v1→v2 zmienia prompt i transport full→compact, więc nie izoluje wpływu samego promptu. Dla przyszłej pary Sol/Astra v2 transport musi być identyczny. Nie porównywać kosztów i jakości jako kontrolowanego testu modelu pomiędzy wersjami.

## Kolejny płatny krok — nie uruchomiony

Najpierw zatwierdzenie kandydatury promptu i osobny limit dla jednego W01 v2. Dotychczasowy workflow **Sol W01 only nadal wykonuje v1**; nie należy go uruchamiać w celu przetestowania v2. Przed live v2 potrzebne jest osobne przygotowanie chronionego pojedynczego uruchomienia, oznaczenie wersji, ponowna kontrola cen i budżetu oraz jawna zgoda. Nie kasować istniejących rezerw 5+2,10 PLN. Nie rozpoczęto zdjęć, Coacha, nowych modeli ani integracji aplikacji.
