# Glazbeni festivali

Ovaj skup podataka sadrži informacije o glazbenim festivalima održanim u Hrvatskoj i svijetu tijekom 2025. godine. Skup uključuje podatke o festivalima, izvođačima, datumima održavanja, cijenama ulaznica i organizatorima. Također prikazuje vezu između festivala i izvođača (jedan izvođač može nastupati na više festivala, jedan festival ima više izvođača).  

# Metapodaci

Licencija: Creative Commons Zero v1.0 Universal 
Autor: Stella Kiš  
Verzija skupa podataka: 1.0  
Jezik podataka: hrvatski 
Broj instanci: 10 festivala; 3-4 izvođača po festivalu
Izvor podataka: vlastiti unos i javno dostupni podaci o festivalima 

## Opis tablica

Tablica `festivali`– sadrži osnovne informacije o festivalima  
  - Atributi:
    - `festival_id` – jedinstveni identifikator festivala  
    - `naziv_festivala` – naziv festivala  
    - `država` – država u kojoj se festival održava  
    - `grad` – grad u kojem se festival održava  
    - `datum_početka` – datum početka festivala  
    - `datum_završetka` – datum završetka festivala  
    - `cijena_ulaznica` – cijena ulaznice u eurima  
    - `žanrovi_glazbe` – glazbeni žanrovi festivala  
    - `organizator` – osoba ili organizacija koja organizira festival  
    - `web_stranica` – službena web stranica festivala  

Tablica `izvodjaci` – sadrži osnovne informacije o izvođačima  
  - Atributi:  
    - `izvodjac_id` – jedinstveni identifikator izvođača  
    - `ime_izvodjaca` – ime ili naziv izvođača  

Tablica `nastupi` – povezna tablica koja povezuje festivale i izvođače  
  - Atributi:  
    - `festival_id` – ID festivala  
    - `izvodjac_id` – ID izvođača  


# Sadržaj release-a

- CSV datoteka 
- JSON datoteka 
- SQL dump baze podataka 
- README.md i LICENSE
- index.html
- server.js
- openapi.json
