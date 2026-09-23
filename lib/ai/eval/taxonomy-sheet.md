# Sepet — ürün eşdeğerlik taksonomisi · doldurma şablonu

Her gıda için tek soru: **kullanıcı bu terimi sade haliyle yazdığında aşağıdaki
ürün türlerinden hangileri sepete girmeli?**

72 ürün adı okumuyorsun; ~8 grup başlığı okuyup bir satır cevap yazıyorsun.
Kategori kategori bölünmüş, istediğin yerde bırakıp devam edebilirsin.
Doldurulmamış gıda taksonomiye girmez, tahminle dolmaz.

## Nasıl doldurulur

| KABUL alanına yazarsan | Anlamı |
|---|---|
| `A+B` | A ve B kabul, geri kalan gruplar red |
| `sadece A` | A kabul, gerisi red |
| `A, B, C` | Aynı şey, virgül de olur |
| `hepsi` | Tüm gruplar kabul |
| `hiçbiri` | Hiçbiri kabul değil, bu terimde boş dönülmeli |
| `A+B, light olmasın` | A ∪ B, sonra ad deseniyle süz — elenenler red listesine |
| `A+B ama rende hariç` | Aynı mantık |
| `A + C'den sadece Ezine` | A ∪ (C'nin adında "ezine" geçen üyeleri) |
| `B?` | B kararsız → hiçbir listeye girmez |
| `ATLA` | Bu gıda taksonomiye hiç girmez |

PRIMARY: UI kartında hangi tür gösterilsin. Bir grup harfi (`A`), bir kural
(`en ucuz beyaz peynir`, `Torku olan`) ya da `farketmez` yazabilirsin.
`farketmez` yazarsan o vaka primary'yi hiç ölçmez.

Emin değilsen grup harfinin yanına `?` koy. İşaretli grup hiçbir listeye
girmez — emin olmadığın şey ground truth olmaz.

Desenli bir cevap yazarsan (`light olmasın`) uygulanan desenin hangi ürünleri
elediğini sana liste halinde geri göstereceğim; onaylamadan koda girmez.

Bir grubun sayısı ya da örnekleri tuhaf geldiyse o gıdanın tam aday listesi
`taxonomy-appendix.md` dosyasında, aynı harflerle etiketli duruyor. Grup
başlığıyla sayı uyuşmuyorsa gruplama benim hatamdır, söyle, yeniden gruplarım.

---

# Süt ürünleri

## 1/84 · süt   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Aromalı / tatlandırılmış süt              31 aday
       Disney Çilekli Süt 180 Ml · Torku Çilekli Süt 6x180 Ml · Sek Protein Hindistan Cevizi Aromalı Süt 330 Ml
  B) Sade UHT süt (tam yağlı / normal)         20 aday
       Sek Süt 200 Ml · Mis Bakraçlık Süt Tam Yağlı 1 Lt · Sütaş %3,5 Tam Yağlı Süt 1 Lt
  C) Özel diyet varyant (light / laktozsuz / organik / vegan)  9 aday
       İçim Organik Süt 200 Ml · Dost Laktozsuz Süt 1 Lt · Sek Light Süt 1 Lt
  D) Az yağlı süt (%0,5 – %1,8)                 6 aday
       Dost %0.5 Yağlı Süt 1 Lt · Aytaç %0.5 Yağlı Süt 1 Lt · Sek %1.5 Yağlı Süt 1 Lt
  E) Pastörize / günlük süt                     3 aday
       Tire Süt Kooperatifi Pastörize Süt 1 Lt · Sek Tam Yağlı Pastörize Süt 1 Lt · Dost Günlük Pastörize Süt 1 Lt
  F) Çoklu paket (6'lı / 9'lu kutu)             2 aday
       İçim Süt 6x200 Ml · Danone Doğal Süt 6x180 Ml
  G) Barista / protein sütü                     1 aday
       İçim Barista Süt 1 Lt

KABUL   : B+D
PRIMARY : B
NOT     : 

## 2/84 · yoğurt   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sade yoğurt (homojenize / klasik)         22 aday
       Mis Tam Yağlı Homojenize Yoğurt 750 Gr · Torku %3 Yağlı Yoğurt 3 Kg · Eker Bidon Yoğurt 2 Kg
  B) Meyveli / aromalı / katkılı yoğurt        14 aday
       Eker Çilekli Yoğurt 65 Gr · Dost Gurme Karma Meyveli Yoğurt 125 Gr · Sütaş Sarımsaklı Yoğurt 500 Gr
  C) Özel diyet varyant (light / laktozsuz / organik / vegan)  8 aday
       İçim Laktozsuz Yoğurt 750 Gr · Sek Light Yoğurt 500 Gr · Mis Laktozsuz Yoğurt 750 Gr
  D) Kaymaklı yoğurt                            7 aday
       Eker Kaymaklı Yoğurt 500 Gr · Tire Kaymaklı Yoğurt 1.5 Kg · Arslan Kaymaklı Yoğurt 900 Gr
  E) Süzme yoğurt                               5 aday
       Eker Süzme Yoğurt Kase 500 Gr · İçim Süzme Yoğurt 500 Gr · Yörüksüt Süzme Yoğurt 900 Gr
  F) Kaymaksız yoğurt                           5 aday
       Sütaş Kaymaksız Yoğurt 200 Gr · Sütaş Kaymaksız Yoğurt 1 Kg · Sütaş Kaymaksız Yoğurt 2 Kg
  G) Az / yarım yağlı yoğurt                    5 aday
       Sek Yarım Yağlı Yoğurt 750 Gr · Yörüksüt Yarım Yağlı Yoğurt 3 Kg · Aynes %0.6 Yağlı Yoğurt 3 Kg
  H) Çömlek / ekşi maya / manda yoğurdu         3 aday
       Yörüksüt Çömlek Yoğurt 700 Gr · Velioğlu Manda Sütlü Çömlek Yoğurt 750 Gr · Sek Ekşi Maya Yoğurt 750 Gr
  I) Probiyotik yoğurt                          2 aday
       Eker Probiyotik Yoğurt 900 Gr · Activia Probiyotik Yoğurt 400 Gr
  J) Yoğurt mayası (yoğurt değil)               1 aday
       Vivo Probiyotik Yoğurt Mayası 4 Gr

KABUL   : A+D+F+G
PRIMARY : A
NOT     : 

## 3/84 · peynir   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Beyaz peynir (inek / klasik)              18 aday
       İçim Beyaz Peynir 500 Gr · Aknaz Naturel Beyaz Peynir 600 Gr · Sütaş Tam Yağlı Beyaz Peynir 1 Kg
  B) Süzme peynir                              16 aday
       Cebeci Süzme Peynir 400 Gr · Mis Yarım Yağlı Süzme Beyaz Peynir 500 Gr · Sütaş Süzme Peynir 1 Kg
  C) Krem peynir / sürülebilir                  9 aday
       Peysan Krem Peynir 300 Gr · Migros Tam Yağlı Taze Sürülebilir Peynir 200 Gr · Aktek Krem Peynir 500 Gr
  D) Olgunlaştırılmış / eski / ezine / tulum    7 aday
       Gürova Olgunlaştırılmış Peynir 1 Kg · Ünal Trakya Olgunlaştırılmış Peynir 600 Gr · Peyser Olgunlaştırılmış Peynir 500 Gr
  E) Otlu / kekikli / zeytinli aromalı taze peynir  6 aday
       Aknaz Kekikli Zeytinli Taze Peynir 180 Gr · Kiri Kekikli Tam Yağlı Taze Peynir 150 Gr · Trakya Çiftliği Pesto Soslu Zeytinyağlı Taze Peynir 200 Gr
  F) Tel / top / çubuk / örgü peynir            6 aday
       Kerem Çubuk Toptane Peynir 250 Gr · Mis Peynir Topları 250 Gr · Muratbey Topi Peynir 200 Gr
  G) Sade taze peynir                           4 aday
       Kiri Tam Yağlı Taze Peynir 300 Gr · Primavera Peynir 4 Adet · Tahsildaroğlu Peynir 1 Kg
  H) Özel diyet varyant (light / laktozsuz / organik / vegan)  3 aday
       Milgo Laktozsuz Taze Sürülebilir Peynir 180 Gr · Bahçıvan Light Laktozsuz Dilimli Beyaz Peynir 420 Gr · Bahçıvan Yarım Yağlı Laktozsuz Süzme Peynir 500 Gr
  I) Üçgen / dilimli tost peyniri               3 aday
       Migros Üçgen Peynir 120 Gr · Torku Üçgen Peynir 100 Gr · Sütaş Üçgen Peynir 8'li 100 Gr

KABUL   : A
PRIMARY : A
NOT     : 

## 4/84 · ayran   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sade ayran                                41 aday
       Dost Bardak Ayran 200 Ml · Torku Ayran 2 Lt · Tire Süt Kooperatifi Cam Şişe Ayran 1 Lt
  B) Kefir (ayran değil)                       15 aday
       Mis Probiyotikli Sade Kefir 200 Ml · Pınar Kefir 1 Lt · Sütaş Kaf Orman Meyveli Kefir 1 Lt
  C) Ekşi maya / kara maya ayran                7 aday
       Arslan Karamaya Ayran 245 Ml · Arslan Karamaya Ayran 1 Lt · Üstad Kara Maya Ayran Cam Şişe 1 Lt
  D) Az / yarım yağlı ayran                     4 aday
       Sek Yarım Yağlı Ayran 200 Ml · Yörükoğlu %1.8 Yağlı Ayran 2 Lt · Yörsan Susurluk Ayran %2.3 Yağlı 265 Ml
  E) Naneli / aromalı ayran                     3 aday
       Dost Naneli Ayran 300 Ml · Sek Naneli Ayran 300 Ml · Sek Naneli Bardak Ayran 300 Ml
  F) Aromalı probiyotik içecek (ayran değil)    1 aday
       İçim Probiyotik Kara Mürver ve Yaban Mersinli İçecek 250 Ml
  G) Çoklu paket ayran                          1 aday
       Eker Tombul Ayran 6x195 Ml

KABUL   : A+D
PRIMARY : A
NOT     : 

## 5/84 · tereyağı   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sade tereyağı                             47 aday
       Sütaş Tereyağı 125 Gr · İçim Tereyağı 225 Gr · Pınar Tereyağ 1 Kg
  B) Yayık / geleneksel / köy tereyağı          9 aday
       Polonezköy Hususi Tereyağı 200 Gr · Sütaş Yayık Tereyağı 250 Gr · Tahsildaroğlu Geleneksel Pastörize Tereyağı 300 Gr
  C) Margarin (tereyağı değil)                  7 aday
       Sana Tereyağı Lezzeti Margarin 250 Gr · Becel Tereyağı Keyfi Kase Margarin 250 Gr · Becel Tereyağı Keyfi Kase Margarin 500 Gr
  D) Sürülebilir yağ / sade yağ (tereyağı değil)  4 aday
       Lurpak Tuzsuz Sürülebilir Yağ 250 Gr · Lurpak Tuzlu Sürülebilir Yağ 250 Gr · Vtr Sade Yağ 350 Gr
  E) Tuzsuz tereyağı                            2 aday
       President Tuzsuz Tereyağı 200 Gr · Gürata Tam Yağlı Tuzsuz Tereyağı 500 Gr
  F) Tuzlu tereyağı                             2 aday
       President Tuzlu Tereyağı 200 Gr · Mis Tuzlu Tereyağı 500 Gr
  G) Aromalı / katkılı tereyağı                 1 aday
       Milgo Sarımsaklı Biberiye Tereyağ 250 Gr

KABUL   : A+B?+E?+F?
PRIMARY : A
NOT     : 

## 6/84 · krema   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Krema dolgulu atıştırmalık (gofret / bisküvi / kek) 18 aday
       Nutbari Kakaolu Krema + Grissini 52 Gr · Dippo Fındık Krema Dolgulu Draje Oyuncaklı Gofret 25 Gr · Full 45 Yerfıstığı Ezmeli Krema Dolgulu Kurabiye 125 Gr
  B) Sade süt kreması (%18 – %35 yağlı)        16 aday
       Tikveşli %18 Yağlı Krema 200 Ml · Dost Krema 200 Ml · Mis UHT Krema %35 Yağlı 200 Ml
  C) Fındık / kakao kreması (sürülebilir)      14 aday
       Ülker Hobby Kakaolu Krema 350 Gr · Karmen Kakaolu Fındık Kreması 400 Gr · Antebella Bomba Fıstık Ezmesi Kakaolu Fındık Kreması 320 Gr
  D) Ekşi krema aromalı cips / kraker           7 aday
       Eti Crax Thins Taze Biber Ekşi Krema 12x70 Gr · Lorenz Ekşi Krema Aromalı Patates Cipsi 100 Gr · Tadım Fıstıxx Ekşi Krema&Soğan 140 Gr
  E) Bitkisel krema                             7 aday
       Dost %20 Yağlı Bitkisel Krema 200 Ml · Danone Bitkisel Krema 500 Ml · Sana Bitkisel Krema 200 Ml
  F) Ekşi krema / smetana                       4 aday
       Yörüksüt Smetana Ekşi Krema 180 Gr · President Ekşi Krema Sour Cream Smetana 285 Gr · Rus Fırın Ekşi Krema Smetana Sour Cream 300 Gr
  G) Kahve kreması                              3 aday
       Intenso Kahve Kreması 200 Gr · Sek Laktozsuz Kahve Kreması 10x15 Ml · Nescafé Coffee Mate Kahve Kreması 200 Gr
  H) Sprey krema                                2 aday
       Vitala Sprey Krema 250 Gr · Schlagfix Çikolatalı Sprey Krema 200 Ml
  I) Aromalı yemeklik krema                     1 aday
       İçim Şef Pestolu Krema 200 Ml

KABUL   : B+E
PRIMARY : B
NOT     : 

## 7/84 · kaymak   ·   26 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Dondurma / kornet (kaymak aromalı)        12 aday
       Kaymak Kornet Dondurma 120 Ml · Algida Cornetto Classico Kaymak 125 Ml · Algida Usta Bol Kaymak Dondurma 500 Ml
  B) Rulo kaymak                                8 aday
       Yörüksüt Rulo Kaymak 100 Gr · Sek Rulo Kaymak 150 Gr · Duranlar Rulo Süt Kaymağı 150 Gr
  C) Sade kaymak                                4 aday
       Eker Kaymak 100 Gr · Kerem Kaymak 200 Gr · Eker Kaymak 200 Gr
  D) Yoğurt (kaymak değil)                      1 aday
       Sütaş Kaymak Gibi Kaymaksız Yoğurt 1.25 Kg
  E) Ballı kaymak                               1 aday
       Kerem Ballı Kaymak 200 Gr

KABUL   : B+C
PRIMARY : B
NOT     : 

## 8/84 · labne   ·   38 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Sade labne                                25 aday
       Mis Labne 200 Gr · İçim Labne Peynir 400 Gr · Sütaş Labne Avantaj 540 Gr
  B) Çoklu paket labne                          6 aday
       Pınar Labne 8x20 Gr · Kiri Tam Yağlı Taze Peynir Labne 3x150 Gr · Bahçıvan Labne Peyniri 3 Adet
  C) Özel diyet varyant (light / laktozsuz / organik / vegan)  4 aday
       Pınar Organik Labne 180 Gr · İçim Rahat Laktozsuz Labne 180 Gr · Biogurme Organik Laktozsuz Labne 200 Gr
  D) Aromalı labne (pesto / zeytinli kekikli)   2 aday
       İçim Pesto Soslu Labne 180 Gr · İçim Zeytinli Kekikli Labne 180 Gr
  E) Keçi labnesi                               1 aday
       Baltalı %100 Keçi Labneh 200 Gr

KABUL   : A
PRIMARY : A
NOT     : 

## 9/84 · kefir   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Meyveli / aromalı kefir                   42 aday
       Mis Probiyotikli Çilekli Kefir 200 Ml · İçim Orman Meyveli Kefir 250 Ml · Eker Çilekli Kefir 1 Lt
  B) Sade kefir                                14 aday
       Mis Probiyotikli Sade Kefir 200 Ml · Eker Sade Kefir 200 Ml · İçim Kefir Sade 250 Ml
  C) Ayran (kefir değil)                        9 aday
       Mis Bardak Ayran Tam Yağlı 285 Ml · Özerhisar Cam Şişe Ayran 245 Ml · Sütaş Ayran 2.5 Lt
  D) Özel diyet varyant (light / laktozsuz / organik / vegan)  4 aday
       Altınkılıç Laktozsuz Kefir 250 Ml · Altınkılıç Laktozsuz Kefir 1 Lt · İçim Laktozsuz Kefir 1 Lt
  E) Kefir mayası                               1 aday
       Sevdanem Tek Kullanımlık Kuru Doğal Kefir Mayası 3x0.5 Gr
  F) Aromalı probiyotik içecek (kefir değil)    1 aday
       İçim Probiyotik Kara Mürver ve Yaban Mersinli İçecek 250 Ml
  G) Keçi kefiri                                1 aday
       Baltalı %100 Keçi Kefir 250 Ml

KABUL   : B+A?
PRIMARY : B
NOT     : 

## 10/84 · lor   ·   13 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Sade lor peyniri                           5 aday
       Mis Lor Peyniri 500 Gr · Muratbey Lor Peyniri 500 Gr · Ünal Taze Lor Peyniri 1 Kg
  B) Yağsız / yarım yağlı lor                   4 aday
       Onur Yağsız Lor Peyniri 500 Gr · Muratbey Yarım Yağlı Taze Lor Peyniri 500 Gr · Torku Yarım Yağlı Taze Lor Peyniri 500 Gr
  C) Torba lor                                  2 aday
       Tahsildaroğlu Torba Lor Peyniri 350 Gr · Tahsildaroğlu Torba Lor Peyniri 500 Gr
  D) Sürülebilir lor                            1 aday
       La Vache Qui Rit Sürülebilir Lor Peyniri 150 Gr
  E) Kaşar loru                                 1 aday
       Kervan Kaşar Loru 1 Kg

KABUL   : A+B
PRIMARY : A
NOT     : 

---

# Ekmek & unlu

## 11/84 · ekmek   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Kızarmış / gevrek ekmek (kraker)          13 aday
       Wasa İnce Gevrek Ekmek 270 Gr · Wasa Fibre Gevrek Ekmek 230 Gr · Eti Etimek Klasik Kızarmış Ekmek 3x143 Gr
  B) Tam buğday / kepekli / çavdarlı / çok tahıllı 13 aday
       Ekmek Dünyası Favori Ekşi Mayalı Tam Buğday Unlu Ekmek 475 Gr · Tazepan Çok Tahıllı Ekmek 430 Gr · Unabella Senza Crosta Tam Buğdaylı Çavdar Unlu Ekmek 500 Gr
  C) Özel diyet varyant (light / laktozsuz / organik / vegan) 10 aday
       İHE Glutensiz Ekmek 50 Gr · Schar Glutensiz Ekmek 250 Gr · Eti Cicibebe Şekersiz Ekmek 125 Gr
  D) Baget ekmek                                8 aday
       Sade Baget Ekmek 75 Gr · Kuru Domates Fesleğenli Artizan Baget Ekmek 285 Gr · Baget Ekmek Sade 255 Gr 1 Adet
  E) Sade ekmek                                 7 aday
       Ekmek 1 Adet · Büyük Ekmek 1 Adet · Simit Ekmek 1 Adet
  F) Tost / sandviç / hamburger ekmeği          6 aday
       Ekmek Dünyası Favori Kanepe Sandviç 200 Gr · İyilik Sandviç Ekmeği 455 Gr · Untad Sandviç Ekmeği 6 Adet
  G) Ekmek cipsi / kıtırı                       4 aday
       Happy Roots Glutensiz Ekmek Kıtırı 100 Gr · Unistanbul Cartocci Ballı Tarçınlı Ekmek Cipsi 110 Gr · Unistanbul Domates Fesleğenli Ekmek Kıtırı 110 Gr
  H) Lavaş ekmek                                4 aday
       Fit Ekmek Lavaş Ekmek Çeşitleri 300 Gr · Unlüx Lavaş Ekmek 20 Cm 540 Gr · Unlüx Lavaş Ekmek 30 Cm 720 Gr
  I) Ekşi mayalı ekmek                          3 aday
       Tamköy Ekşi Mayalı Ekmek 1 Kg · M Ekmek Ekşi Mayalı 200 Gr · Ekşi Mayalı Kare Rustik Ekmek 380 Gr
  J) Katkılı ekmek (fındıklı / zeytinli / fesleğenli)  2 aday
       İHE Fındıklı Ve Üzümlü Ekmek 50 Gr · İhe Altınçerez Fındıklı Ve Üzümlü Ekmek 60 Gr
  K) Ekmek unu (ekmek değil)                    1 aday
       Sinangil Köy Ekmek Unu 500 Gr
  L) Ekmek kırıntısı / panko                    1 aday
       Panko Japon Ekmek Kırıntısı 200 Gr

KABUL   : B+D+E+F+H+I
PRIMARY : B
NOT     : 

## 12/84 · un   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sade buğday unu                           21 aday
       Sinangil Un 1 Kg · Akun Un 5 Kg · Efsane Buğday Unu 5 Kg
  B) Özel diyet / tıbbi un (glutensiz, organik, düşük proteinli) 12 aday
       Söke Glutensiz Un 250 Gr · Sade Organik Beyaz Un 1 Kg · Sade Organik Tam Buğday Unu 1 Kg
  C) Galeta unu                                 7 aday
       Piyale Galeta Unu 400 Gr · Migros Galeta Unu 250 Gr · İnci Galeta Unu 400 Gr
  D) Mısır / pirinç / çavdar unu                7 aday
       Bağdat Mısır Unu 250 Gr · Rençber Mısır Unu 500 Gr · City Farm Organik Mısır Unu 500 Gr
  E) Alternatif un (badem, hindistan cevizi, mercimek, karabuğday)  7 aday
       Arifoğlu Keçiboynuzu Unu 180 Gr · Reis Glutensiz Çiğ Karabuğday Unu 500 Gr · Wefood Badem Unu 250 Gr
  F) Marka adı tuzağı: Un Do Tre (ürün makarna)  6 aday
       Un Do Tre Tricolore Peynirli Tortelloni 300 Gr · Un Do Tre Tricolore Peynirli Tortelloni 350 Gr · Un Do Tre 5 Peynirli Ravioli 350 Gr
  G) Tam buğday unu                             5 aday
       Söke Tam Buğday Un Karışımı 500 Gr · Piyale Tam Buğday Unu 2 Kg · Söke Tam Buğday Unu 1 Kg
  H) Kepekli / esmer / çok tahıllı un           4 aday
       Söke Çok Tahıllı Un Karışımı 500 Gr · Söke Mor Un 500 Gr · Sinangil Kepekli Un 1 Kg
  I) Baklavalık / böreklik un                   2 aday
       Söke Baklavalık ve Böreklik Un 1 Kg · Söke Baklavalık Ve Böreklik Un 2 Kg
  J) Un kurabiyesi (un değil)                   1 aday
       Bisto Un Kurabiyesi 500 Gr

KABUL   : A+G
PRIMARY : A
NOT     : 

## 13/84 · makarna   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Klasik makarna (burgu / fiyonk / kalem / yüksük) 48 aday
       Cardella Fiyonk Makarna 500 Gr · Oba Kalem Kesme Makarna 500 Gr · Barilla Burgu Makarna 500 Gr
  B) Özel diyet varyant (light / laktozsuz / organik / vegan) 12 aday
       Pastavilla Veggi Glutensiz Makarna 350 Gr · Schär Penne Kalem Makarna Glutensiz 250 Gr · Barilla Glutensiz Penne Rigate Makarna 400 Gr
  C) Sebzeli / mercimekli / özel tahıl makarna  3 aday
       Potamya Sarı Mercimek Fusilli Makarna 240 Gr · Filiz Sebzeli Burgu Makarna 350 Gr · Happy Roots Üzüm Çekirdekli Siyez Makarna 200 Gr
  D) Vitaminli makarna                          3 aday
       Nuh'un Ankara Vitaminli Fiyonk Makarna 500 Gr · Nuh'un Ankara Vitaminli Boncuk Makarna 500 Gr · Nuh'un Ankara Vitaminli Burgu Makarna 500 Gr
  E) Tam buğday makarna                         2 aday
       Filiz Tam Buğday Burgu Makarna 350 Gr · Barilla Tam Buğday Burgu Makarna 400 Gr
  F) Fırın makarnası                            2 aday
       Filiz Fırın Makarna 500 Gr · Ankara Fırın Makarna 500 Gr
  G) Yumurtalı makarna                          1 aday
       Filiz Yumurtalı Bukle Makarna 350 Gr
  H) Figürlü / özel form makarna                1 aday
       Barilla Pasta Love Kalpli Makarna 400 Gr

KABUL   : A+E
PRIMARY : A
NOT     : 

## 14/84 · pirinç   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Osmancık pirinç                           19 aday
       Anadolu Mutfağı Osmancık Pirinç 1 Kg · Carrefour Osmancık Pirinç 1 Kg · Efsane Osmancık Pirinç 5 Kg
  B) Baldo pirinç                              18 aday
       Carrefour Baldo Pirinç 1 Kg · Rençber Baldo Pirinç 1 Kg · Reis Gönen Baldo Pirinç 2.5 Kg
  C) Pilavlık / genel pirinç                   13 aday
       Rençber Pilavlık Pirinç 1 Kg · Efsane Yerli Pilavlık Pirinç 2.5 Kg · Yayla Tane Tane Pirinç 2 Kg
  D) Basmati pirinç                             7 aday
       Rençber Basmati Pirinç 1 Kg · Hasata Basmati Pirinç 1 Kg · Reis Royal Superior Basmati Pirinç 500 Gr
  E) Özel diyet varyant (light / laktozsuz / organik / vegan)  4 aday
       Sade Organik Pirinç 500 Gr · Organik Gurme Organik Pirinç 1 Kg · City Farm Organik Pirinç 1 Kg
  F) Jasmin / yasemin pirinci                   3 aday
       Reis Jasmin Pirinç 1 Kg · Efsane Yasemin Kokulu Pirinç 1 Kg · Reis Jasmine Pirinç 1 Kg
  G) Siyah / kahverengi / kepekli pirinç        3 aday
       Yayla Gurme Siyah Pirinç 500 Gr · Reis Royal Kepekli Pirinç 500 Gr · Tilda Kahverengi Pirinç 1 Kg
  H) Kırık pirinç                               3 aday
       Efsane Kırık Pirinç 1 Kg · Anadolu Mutfağı Kırık Pirinç 1 Kg · Reis Kırık Pirinç 1 Kg
  I) Arborio / risotto pirinci                  2 aday
       Scotti Arborio Pirinç 500 Gr · Reis Arborio Risotto Vakumlu Pirinç 500 Gr

KABUL   : A+B+C+D
PRIMARY : A
NOT     : 

## 15/84 · bulgur   ·   71 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Pilavlık bulgur                           18 aday
       Anadolu Mutfağı Pilavlık Bulgur 1 Kg · Anadolu Lezzetleri Mardin Pilavlık Bulgur 1 Kg · Hasata Pilavlık Antep Bulguru 1 Kg
  B) Köftelik / ince bulgur                    13 aday
       Anadolu Mutfağı Köftelik Bulgur 1 Kg · Reis Köftelik Bulgur 1 Kg · Hasata Köftelik Antep Bulguru 1 Kg
  C) Esmer / çiğköftelik / tam tane bulgur     11 aday
       Yayla Esmer Çiğköftelik & Tam Tane Bulgur 1 Kg · Duru Esmer Pilavlık Bulgur 1 Kg · Anadolu Lezzetleri Amik Karakılçık Köftelik Bulgur 500 Gr
  D) Hazır bulgur pilavı (bulgur değil)         9 aday
       Duru Pratik Nohutlu Bulgur Pilavı 200 Gr · Yayla Yemek Hazır Nohutlu Bulgur Pilavı 250 Gr · Gurmepack Tavuk Şiş & Bulgur Pilavı 380 Gr
  E) Özel diyet varyant (light / laktozsuz / organik / vegan)  9 aday
       Dola Glutensiz Pilavlık Bulgur 400 Gr · Sade Organik Pilavlık Bulgur 1 Kg · Ots Organik Siyez Bulguru 750 Gr
  F) Şehriyeli / başbaşı bulgur                 4 aday
       Duru Başbaşı Bulgur 1 Kg · Reis Başakbaşı Bulgur 1 Kg · Reis Şehriyeli Başakbaşı Bulgur 1 Kg
  G) Siyez bulguru                              2 aday
       Yayla Gurme Siyez Bulgur 500 Gr · Reis Siyez Bulgur 1 Kg
  H) İçli köftelik bulgur                       2 aday
       Duru İçli Köftelik Bulgur 1 Kg · Reis İçli Köfte Bulguru 1 Kg
  I) Genel bulgur                               2 aday
       Doyum Bulgur Çeşitleri 1 Kg · Tat Bulgur Çeşitleri 1 Kg
  J) Firik bulgur                               1 aday
       Reis Firik Bulgur 1 Kg

KABUL   : A
PRIMARY : A
NOT     : 

## 16/84 · irmik   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Un (irmik değil)                          37 aday
       Efsane Tam Buğday Unu 2 Kg · Gelenek Un Buğday 2 Kg · Oneva Badem Unu 350 Gr
  B) Sade buğday irmiği                        11 aday
       Piyale İrmik 500 Gr · Mutlu İrmik 500 Gr · Sinangil İrmik 500 Gr
  C) Nişasta (irmik değil)                      8 aday
       Kenton Mısır Nişastası 200 Gr · Piyale Mısır Nişastası 200 Gr · Kenton Buğday Nişastası 200 Gr
  D) Galeta unu / panko (irmik değil)           7 aday
       Piyale Galeta Unu 400 Gr · Öykü Galeta Unu 400 Gr · Panko Japon Ekmek Kırıntısı 200 Gr
  E) Organik irmik                              6 aday
       Sade Organik Buğday İrmiği 500 Gr · City Farm Organik Mısır Unu 500 Gr · Sade Organik Beyaz Un 1 Kg
  F) İrmik helvası (hazır tatlı)                2 aday
       Dr. Oetker Sade İrmik Helvası 360 Gr · Gurmepack İrmik Helvası 150 Gr
  G) Mısır irmiği                               1 aday
       Ege Glutensiz Mısır İrmiği 500 Gr

KABUL   : B
PRIMARY : B
NOT     : 

## 17/84 · galeta unu   ·   11 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Sade galeta unu                            8 aday
       Migros Galeta Unu 250 Gr · Piyale Galeta Unu 400 Gr · İnci Galeta Unu 400 Gr
  B) Panko (Japon ekmek kırıntısı)              2 aday
       Tirmata Panko 200 Gr · Panko Japon Ekmek Kırıntısı 200 Gr
  C) Özel diyet varyant (light / laktozsuz / organik / vegan)  1 aday
       Mayalıhane Glutensiz Galeta Unu 300 Gr

KABUL   : A
PRIMARY : A
NOT     : 

## 18/84 · yufka   ·   26 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Baklavalık / böreklik yufka               10 aday
       Ekmecik Baklavalık Ve Böreklik Yufka 800 Gr · Tamköy Böreklik Yufka 700 Gr · Unabella Kare Böreklik Yufka 24 Yaprak 800 Gr
  B) Sade yufka                                 7 aday
       Tamköy Yufka 500 Gr · Nimet Yufka 1 Kg · Myfresh Yufka 1 Kg
  C) Üçgen yufka                                5 aday
       Tamköy Üçgen Yufka 360 Gr · Aly Üçgen Yufka 360 Gr · Yufkacı Kemal Usta Üçgen Yufka 25 Adet
  D) Yaprak / kat sayılı yufka                  4 aday
       Yufkacı Kemal Usta Yufka 5'li Paket 5 Adet · Unistanbul 3 Yapraklı Yufka 500 Gr · Unabella Sade Pastaban 2 Kat 280 Gr

KABUL   : B+A+C
PRIMARY : B
NOT     : 

## 19/84 · şehriye   ·   32 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Arpa şehriye                              13 aday
       Cardella Arpa Şehriye 500 Gr · Nuh'un Ankara Arpa Şehriye 500 Gr · Barilla Risoni Arpa Şehriye 500 Gr
  B) Tel şehriye                               10 aday
       Cardella Tel Şehriye 500 Gr · Arbella Tel Şehriye 500 Gr · Nuh'un Ankara Tel Şehriye Makarna 500 Gr
  C) Özel diyet varyant (light / laktozsuz / organik / vegan)  5 aday
       Organik Gurme Arpa Şehriye 500 Gr · Dola Glutensiz Arpa Şehriye 250 Gr · Organik Gurme Tel Şehriye 500 Gr
  D) Çorbalık kesme makarna (şehriye değil)     1 aday
       Beypazarı Çorbalık Kesme Makarna 500 Gr
  E) Vitaminli şehriye                          1 aday
       Nuh'un Ankara Vitaminli Arpa Şehriye 500 Gr
  F) Pirinç şehriyesi                           1 aday
       Pirinç Şehriyesi 400 Gr
  G) Yıldız şehriye                             1 aday
       Filiz Yıldız Şehriye 500 Gr

KABUL   : A+B+G
PRIMARY : A
NOT     : 

---

# Et & protein

## 20/84 · et   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Füme / kuru et (şarküteri)                26 aday
       Sultan Dilimli Piliç Füme Et 50 Gr · Polonez Piliç Füme 50 Gr · Yayla Türk Hindi But Füme 1 Kg
  B) Hazır döner                               22 aday
       Lezita Piliç Yaprak Döner 200 Gr · Dondurulmuş Piliç Döner 1 Kg · Gedik Piliç Yaprak Döner 500 Gr
  C) Et bulyon / çeşni / baharat                8 aday
       Hürrem Et Bulyon 80 Gr · Knorr Et Bulyon 24 Adet · Knorr Et Suyu Bulyon 120 Gr
  D) Karides eti (deniz ürünü)                  7 aday
       Marines Karides Et 1 Kg · Rozen 21/25 Kuyruklu Et Karides L.Vannamei 175 Gr · Balık Dünyası Et Karides 1 Kg
  E) Et çubukları / atıştırmalık                4 aday
       Apikoğlu Dana Et Çubukları Atıştırmalık 110 Gr · Pınar Aç Bitir Büyük Dilim Hindi Füme 60 Gr · Beşler Bi Lokma Hindi Füme 55 Gr
  F) Tantuni / dürüm hazır yemek                2 aday
       Aytaç Tavuk Dürüm Tantuni 165 Gr · Ant Bahar Hindi Tantuni 165 Gr
  G) Çiğ dana eti (kuşbaşı / sote)              2 aday
       Emin Dana Kuşbaşı Et 400 Gr · Haket Dana Et Sote 1 Kg
  H) Konserve / kavurma                         1 aday
       Zel Et Kavurma Konserve 2x80 Gr

KABUL   : G+A?
PRIMARY : G
NOT     : 

## 21/84 · kıyma   ·   14 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Yağlı kıyma (%15 – %20)                    5 aday
       Emin %20 Yağlı Dana Kıyma 400 Gr · Uzman Kasap Dana Kıyma %15 Yağlı 400 Gr · Haket Yağlı Kuzu Dana Kıyma 500 Gr
  B) Sade dana kıyma                            4 aday
       Uzman Kasap Dana Kıyma 400 Gr · Lezzetlim Dana Kıyma 400 Gr · Dana Kıyma Map 1 Kg
  C) Yağsız kıyma                               2 aday
       Uzman Kasap Dana Yağsız Kıyma 400 Gr · Haket Yağsız Dana Kıyma 500 Gr
  D) Dana kuzu karışık kıyma                    2 aday
       Bonfilet Dondurulmuş Dana Kuzu Kıyma 500 Gr · Uzman Kasap Dana Kuzu Kıyma 400 Gr
  E) Dondurulmuş kıyma                          1 aday
       Dondurulmuş Dana Kıyma 1 Kg

KABUL   : HEPSİ
PRIMARY : farketmez
NOT     : 

## 22/84 · tavuk   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Bulyon / çeşni / tavuk suyu               21 aday
       Knorr Tavuk Bulyon 6 Adet · Knorr Tavuk Çeşnisi 60 Gr · Gurvita Tavuk Suyu Sade 4x50 Ml
  B) Hazır yemek (burger / döner / sote / salata) 13 aday
       Soslu Buffalo Wings Tavuk Kanat 350 Gr · Gurmepack Köri Soslu Tavuk & Fusilli Makarna 360 Gr · Gurmepack Barbekü Soslu Tavuk & Fusilli Makarna 360 Gr
  C) Hazır noodle                              10 aday
       Indomie Tavuk Köri Tavuk Noodle 75 Gr · Indomie Spesiyel Tavuk Paket Noodle 75 Gr · Indomie Tavuk Çeşnili Noodle 5x70 Gr
  D) Çiğ tavuk parçaları (but / göğüs / kanat / baget) 10 aday
       Şenpiliç Lezita Kemiksiz Tavuk But 1 Kg · Şenpiliç Lezita Tavuk Kanat İncik Üst 1 Kg · Şenpiliç Lezita Bütün Tavuk 1 Kg
  E) Tavuk yumurtası (tavuk eti değil)          7 aday
       Mlife Gezen Tavuk M Boy Yumurta 53-62 Gr 10 Adet · Carrefour Gezen Tavuk Yumurta 10 Adet · Ali Babanın Bahçesi Gezen Tavuk Yumurtası 15 Adet
  F) Hazır çorba                                6 aday
       Yayla Şehriyeli Tavuk Çorbası 65 Gr · Knorr Kremalı Tavuk Çorbası 65 Gr · Knorr Şehriyeli Tavuk Çorbası 51 Gr
  G) Tavuk ciğeri                               2 aday
       Tavuk Ciğeri 1 Kg · Şenpiliç Lezita Tavuk Ciğer 1 Kg
  H) Tavukgöğsü tatlısı                         1 aday
       Pakmaya Tavuk Göğsü 130 Gr
  I) Füme tavuk (şarküteri)                     1 aday
       Yaylatürk Tavuk Göğüs Füme 1 Kg
  J) Özel diyet varyant (light / laktozsuz / organik / vegan)  1 aday
       Yeşilküre Organik Tavuk Göğüs 1 Kg

KABUL   : D
PRIMARY : D
NOT     : Bütün tavuk tercihi öncelik olmalıdır.

## 23/84 · balık   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Ton balığı konservesi                     33 aday
       Bizim Vatan Ton Balığı 2x160 Gr · Sasu Acılı Ton Balığı 2x160 Gr · Dardanel Zeytinyağlı Ton Balığı 225 Gr
  B) Kalamar / ahtapot / midye / yengeç        11 aday
       Balık Dünyası Dondurulmuş Kalamar Tava 115 Gr · Balık Dünyası Halka Kalamar 1 Kg · Balık Dünyası Dondurulmuş Halka Kalamar 1 Kg
  C) Balık kraker (atıştırmalık)                9 aday
       Eti Balık Kraker 40 Gr · Eti Balık Kraker 160 Gr · Eti Çıtır Balık Kraker 70 Gr
  D) Karides                                    7 aday
       Balık Dünyası Karides Söğüş 300 Gr · Balık Dünyası Dondurulmuş Jumbo Karides Tava 150 Gr · Balık Dünyası Et Karides 1 Kg
  E) Taze / dondurulmuş bütün balık             6 aday
       Balık Dünyası Uskumru Fileto 500 Gr · Balık Dünyası Temizlenmiş Levrek 600 Gr · Balık Dünyası Norveç Somon Dilim 500 Gr
  F) Hazır / çıtır balık ürünü                  3 aday
       Balık Dünyası Fish Finger 250 Gr · Pınar Çıtır Balık 400 Gr · Dardanel Küçük Balık Serisi 485 Gr
  G) Füme balık                                 2 aday
       Dardanel Soğutulmuş Somon Füme Balık 40 Gr · Dardanel Soğutulmuş Somon Füme Balık 80 Gr
  H) Balık sosu                                 1 aday
       Thai Balık Sosu 200 Ml

KABUL   : E
PRIMARY : E
NOT     : 

## 24/84 · yumurta   ·   63 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Organik yumurta                           16 aday
       Organik Yumurta 6 Adet · Cityfarm Organik Yumurta 10 Adet · Ali Babanın Bahçesinden Organik Yumurta 15 Adet
  B) Sade yumurta                              13 aday
       Kumbasar Yumurta 53-62 Gr 6 Adet · Carrefour Yumurta 30 Adet · Bili Bili Yumurta 53-62 Gr 30 Adet
  C) Sürpriz / oyuncaklı yumurta (oyuncak)     12 aday
       Jimmy Toys Oyuncaklı Yumurta Pembe 25 Gr · Kinder Joy Sürpriz Yumurta Çikolata 20 Gr · Ozmo Yumurta 2x20 Gr
  D) Gezen tavuk / free range yumurta           9 aday
       Carrefour Gezen Tavuk Yumurta 10 Adet · Anadolu Çiftliği Gezen Tavuk Yumurta M Boy 10 Adet · Ali Babanın Bahçesi Gezen Tavuk Yumurtası 15 Adet
  E) Kahverengi / beyaz yumurta                 5 aday
       Kahverengi Yumurta 10 Adet · Kumbasar Kahverengi Yumurta 53-62 Gr 10 Adet · Keskinoğlu Beyaz Yumurta L Boy 63-73 Gr 20 Adet
  F) Jumbo / L / XL boy yumurta                 4 aday
       Kumbasar Jumbo Yumurta Üstü 10 Adet · Güres Yumurta L Boy 53-62 Gr 30 Adet · Güres Yumurta XL Boy 73 Gr 20 Adet
  G) Omega 3 yumurta                            2 aday
       Anadolu Çiftliği Omega 3 Yumurta M Boy 53-62 Gr 10 Adet · Keskinoğlu Omega-3 Boy Yumurta 10 Adet
  H) Yumurta kabuk makarna (yumurta değil)      1 aday
       Happy Roots Yumurta Kabuk Siyez Makarna 1 Adet
  I) Bıldırcın yumurtası                        1 aday
       Güres Bıldırcın Yumurta 12 Adet

KABUL   : A+B+D+E+F+G
PRIMARY : B
NOT     : 

## 25/84 · sucuk   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Kangal sucuk                              15 aday
       Çatal Sucuk İlikli Dana Kangal Sucuk 450 Gr · Erşan Vakumlu Kangal Sucuk 200 Gr · Apikoğlu Kangal Sucuk 1 Kg
  B) Piliç / hindi sucuk (kanatlı)             12 aday
       Keskinoğlu Dilimli Piliç Sucuk 400 Gr · Beşler Hünkar Dilimli Piliç Sucuk 260 Gr · Gedik Baton Piliç Sucuk 450 Gr
  C) Sade dana sucuk                           11 aday
       Pınar Mangal Keyfi Sucuk 300 Gr · Adana Sucuk 1 Kg · Başyazıcı İnan Dana Sucuk 400 Gr
  D) Fermente sucuk                             9 aday
       Dana Fermente Mangal Sucuk 400 Gr · Cumhuriyet Evlik Fermente Dana Sucuk 300 Gr · Dana Evlik Fermente Sucuk 400 Gr
  E) Parmak / baton sucuk                       7 aday
       Namet Parmak Sucuk 1 Kg · Başyazıcı Efsane Parmak Sucuk 300 Gr · Apikoğlu Baton Sucuk 1 Kg
  F) Kasap / geleneksel sucuk                   6 aday
       Erşan Dana Kasap Sucuk 300 Gr · Polonez Kasap Sucuk 1 Kg · Başyazıcı Dana Kasap Sucuk 400 Gr
  G) Isıl işlem görmüş sucuk                    5 aday
       Pınar Aç Bitir Isıl İşlem Görmüş Dana Sucuk 75 Gr · Isıl İşlem Görmüş Dana Kangal Sucuk 500 Gr · Torku Isıl İşlem Dana Kangal Sucuk 450 Gr
  H) Acılı sucuk                                4 aday
       Torku Vakumlu Acılı Sucuk 225 Gr · Torku Acılı Sucuk 225 Gr · Polonez Acılı Sucuk 240 Gr
  I) Dilimli sucuk                              3 aday
       Emin Dana Dilimli Sucuk 250 Gr · Namet Dilimli Dana Sucuk 250 Gr · Sultan Dilimli Dana Sucuk 250 Gr

KABUL   : A+B+C+F+G+I
PRIMARY : A
NOT     : 

## 26/84 · salam   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Hindi salam                               31 aday
       Açık Büfe Hindi Salam 50 Gr · Pınar Keyifle Hindi Salam 500 Gr · Pınar Doyum Büfe Hindi Salam 700 Gr
  B) Macar salam                               21 aday
       Namet Dana Macar Salam 60 Gr · Torku Dana Dilimli Macar Salam 60 Gr · Pınar Kahvaltılık Macar Salam 250 Gr
  C) Piliç salam                               10 aday
       Polonez Piliç Füme Salam 60 Gr · Piliç Salam 1 Kg · Gedik Piliç Salam 700 Gr
  D) Fıstıklı salam                             4 aday
       Torku Dilimli Fıstıklı Salam 50 Gr · Pınar Fıstıklı Salam 1 Kg · Namet Dilimli Fıstıklı Salam 150 Gr
  E) Genel salam                                2 aday
       Torku Dilimli Salam 60 Gr · Pınar Doyum Salam 700 Gr
  F) Salamlı sandviç (hazır ürün)               1 aday
       Mr. No Peynir Salam Baton Sandviç 130 Gr
  G) Organik salam                              1 aday
       Orvital Organik Dilimli Dana Salam 60 Gr
  H) Dana salam                                 1 aday
       Emin Sade Fıstıklı Dilimli Dana Salam 60 Gr
  I) Biberli salam                              1 aday
       Polonez Biberli Salam 1 Kg

KABUL   : A+B+C+E+G+H
PRIMARY : A
NOT     : 

## 27/84 · hindi   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Hindi salam                               26 aday
       Carrefour Hindi Salam 50 Gr · Aytaç Hindi Salam 500 Gr · Pınar Fıstıklı Uzun Hindi Salam 1 Kg
  B) Hindi füme                                21 aday
       Carrefour Hindi Füme 50 Gr · Aytaç Gurme Dilimli Hindi Füme 60 Gr · Yayla Türk Hindi But Füme 1 Kg
  C) Çiğ hindi parçaları (but / göğüs / külbastı)  7 aday
       Bolca Hindi Külbastı 500 Gr · Bolca Hindi Sote But 750 Gr · Bolca Bütün Fileto Hindi Göğüs 750 Gr
  D) Hindi konservesi                           6 aday
       Ant Bahar Fit Hindi Fileto Konservesi 165 Gr · Ant Bahar Tahıllı Tohumlu Hindi Konservesi 185 Gr · Ant Bahar Hindi Tandır Konservesi 2x120 Gr
  E) Pişmiş / hazır hindi                       5 aday
       Hindice 4 Tahıllı Hindi 160 Gr · Hindice Hindi Fileto 140 Gr · Bahar Hindi Pişmiş Tandır 120 Gr
  F) Hindi sosis                                4 aday
       Hindi Sosis 130 Gr · Pınar Hindi Sosis 430 Gr · Pınar Hindi Uzun Sosis 430 Gr
  G) Hindi jambon                               2 aday
       Polonez Hindi Jambon 50 Gr · Polonez Hindi Jambon 2x50 Gr
  H) Hindi sucuk                                1 aday
       Pınar Hindi Doyum Sucuk 225 Gr

KABUL   : C
PRIMARY : C
NOT     : Salam seçenekleri için, hindi değilde hindi salam şeklinde veya hindi füme şeklinde belirtilmesi daha uygun olur.

## 28/84 · kuzu   ·   18 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Hazır köfte / kebap                        5 aday
       Emin Dana Kuzu Izgara Köfte 400 Gr · İnci Dana Kuzu Kaşarlı Köfte 500 Gr · İnci Dana Kuzu Kasap Köfte 500 Gr
  B) Kokoreç                                    3 aday
       Akşeker Donuk Kuzu Dilim Kokoreç 200 Gr · Akşeker Baharatlı Kuzu Kokoreç 200 Gr · Şampiyon Sade Kuzu Kokoreç 180 Gr
  C) Dana kuzu karışık kıyma                    3 aday
       Bonfilet Dondurulmuş Dana Kuzu Kıyma 500 Gr · Uzman Kasap Dana Kuzu Kıyma 400 Gr · Haket Yağlı Kuzu Dana Kıyma 500 Gr
  D) Kuzu kulağı (bitki, et değil)              2 aday
       Kuzu Kulağı Demet 1 Adet · Kuzu Kulağı 150 Gr
  E) Kuzu kemik suyu                            2 aday
       Gurvita Kuzu İlikli Kemik Suyu 4x50 Ml · Gurvita Kuzu İlikli Kemik Suyu 320 Ml
  F) Kuzu döner                                 1 aday
       Emin Dana Kuzu Döner 300 Gr
  G) Kuzu kavurma                               1 aday
       Haket Kuzu Sac Kavurma 1 Kg
  H) Çiğ kuzu eti (kuşbaşı)                     1 aday
       Kuzu Kuşbaşı 1 Kg

KABUL   : H+C
PRIMARY : H
NOT     : 

## 29/84 · pastırma   ·   25 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Çemensiz / çemeni sıyrılmış pastırma      10 aday
       Emin Çemensiz Pastırma 120 Gr · Özlem Çemeni Sıyrılmış Dana Pastırma 100 Gr · Namet Çemeni Sıyrılmış Dilimli Pastırma 130 Gr
  B) Dilimli pastırma                           5 aday
       Lezzetlim Dilimli Pastırma 120 Gr · Erşan Dilimli Seçme Pastırma 120 Gr · Sultan Dilimli Pastırma 1 Kg
  C) Antrikot pastırma                          4 aday
       Polonez Dilimli Dana Antrikot Pastırma 100 Gr · Namet Antrikot Pastırma 1 Kg · Namet Dilimli Dana Antrikot Pastırma 100 Gr
  D) Parça / seçme pastırma                     3 aday
       Başyazıcı İnan Seçme Pastırma 80 Gr · Apikoğlu Parça Pastırma 80 Gr · Polonez Seçme Pastırma 75 Gr
  E) Sade dana pastırma                         3 aday
       Altındana Dana Pastırma 120 Gr · Başyazıcıoğlu İnan Dana Pastırma 120 Gr · Polonez Pastırma 90 Gr

KABUL   : HEPSİ
PRIMARY : B
NOT     : 

---

# Taze sebze

## 30/84 · domates   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Domates salçası                           34 aday
       Tat Domates Salçası 170 Gr · Tukaş Domates Salçası Cam 700 Gr · Kazova Domates Salçası 1.65 Kg
  B) Domates rendesi / rendelenmiş              8 aday
       Merko Gusdo Rendelenmiş Domates 700 Gr · Tat Domates Rendesi 685 Gr · Burcu Organik Rendelenmiş Domates 685 Gr
  C) Taze domates (kg)                          8 aday
       Domates 1 Kg · Domates Pembe 1 Kg · Salkım Domates 1 Kg
  D) Domates püresi                             5 aday
       Migros Domates Püresi 700 Gr · Tat Domates Püresi 200 Gr · Tamek Domates Püresi 3 Adet 630 Gr
  E) Doğranmış / soyulmuş konserve domates      5 aday
       Gusdo Merko Doğranmış Domates 400 Gr · Tat Doğranmış Domates 340 Gr · Demko Soyulmuş Domates 400 Gr
  F) Kokteyl / şeker / atıştırmalık domates     4 aday
       Kokteyl Domates 1 Kg · Atıştırmalık Domates 1 Kg · Kokteyl Domates 500 Gr
  G) Kurutulmuş domates                         3 aday
       Deli Chef Kurutulmuş Domates 280 Gr · Tat Kurutulmuş Domates 200 Gr · Gurumen Domates Kurusu 290 Gr
  H) Hazır domates çorbası                      2 aday
       Knorr Çabuk Çorba Acılı Domates 22 Gr · Knorr Kremalı Domates Çorbası 69 Gr
  I) Domates suyu                               1 aday
       Cappy Domates Suyu 1 Lt
  J) Bruschetta / hazır meze                    1 aday
       Domates Fesleğenli Bruschetta 110 Gr
  K) Zeytin (domates değil)                     1 aday
       Fora Domates Zeytin 111-140 1 Kg

KABUL   : C
PRIMARY : C
NOT     : 

## 31/84 · salatalık   ·   36 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Salatalık turşusu (klasik)                16 aday
       Bizim Vatan Salatalık Turşusu 670 Gr · Berrak Salatalık Turşusu 340 Ml · Farge Organik Salatalık Turşusu 600 Gr
  B) Tatlı / hafif / yabancı tip turşu          9 aday
       Berrak Tatlı Salatalık Turşusu 680 Gr · Kühne Alman Tipi Salatalık Turşusu 670 Gr · Kühne Türk Tipi Salatalık Turşusu 670 Gr
  C) Taze salatalık / hıyar                     5 aday
       Salatalık 1 Kg · Salatalık 1 Adet · Hıyar 1 Kg
  D) Kornişon turşusu                           2 aday
       Fıçı Kornişon Salatalık Turşusu 670 Gr · Tat Kornişon Turşusu Cam 680 Gr
  E) Deodorant (salatalık aromalı)              1 aday
       Dove Salatalık Yeşil Çay Sprey Deodorant 150 Ml
  F) İçecek (salatalık aromalı)                 1 aday
       Pupple Bubble Tea Aloe Vera Salatalık Nane 400 Ml
  G) Turşuluk taze kornişon                     1 aday
       Turşuluk Kornişon 1 Kg
  H) Burger / dilimli turşu                     1 aday
       Kühne Halka Dilimli Burger Turşusu 530 Gr

KABUL   : C
PRIMARY : C
NOT     : 

## 32/84 · biber   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Biber salçası                             21 aday
       Yurdum Tatlı Biber Salçası 650 Gr · Yurdum Acı Biber Salçası 650 Gr · Öncü Tatlı Biber Salçası 1.65 Kg
  B) Közlenmiş biber                           10 aday
       Melis Közlenmiş Dilimli Jalapeno Biber Turşusu 340 Gr · Tada Közlenmiş Biber 680 Gr · Kühne Közlenmiş Biber 530 Gr
  C) Acı biber turşusu                         10 aday
       Migros Acı Biber Turşusu 335 Gr · Ev Acı Biber Turşusu 340 Gr · Anadolu Lezzetleri Samandağ Acı Biber Turşusu 500 Gr
  D) Pul biber / toz biber (baharat)            8 aday
       Migros Pul Biber 85 Gr · Knorr Pul Biber 65 Gr · Pul Biber 1 Kg
  E) Jalapeno turşusu                           7 aday
       Migros Jalapeno Acı Biber Turşusu 350 Gr · Berrak Jalapeno Acı Biber Turşusu 340 Gr · Kemal Kükrer Dilimli Jalapeno Biber Turşusu 330 Ml
  F) Taze biber (kapya / çarliston / dolma / sivri)  7 aday
       Kapya Biber 1 Kg · Yeşil Biber 1 Kg · Sivri Biber 1 Kg
  G) Yunan / makedon / misket / frenk biber turşusu  5 aday
       Sera Yunan Biber Turşusu 600 Gr · Sera Izgara Makedon Biber Turşusu 600 Gr · Sera Acı Frenk Biber Turşusu 640 Gr
  H) Peynir dolgulu biber (meze)                3 aday
       Gurumen Peynir Dolgulu Jalapeno Biber 290 Gr · Gurumen Peynir Dolgulu Makedon Biber 290 Gr · Gurumen Peynir Dolgulu Kiraz Biber 290 Gr
  I) Genel biber                                1 aday
       Bizim Vatan Acı Biber 325 Gr

KABUL   : F
PRIMARY : F
NOT     : 

## 33/84 · soğan   ·   41 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Cips / çerez (soğan aromalı)              16 aday
       Çerezza Muhabbet Biftek & Soğan Çeşnili 60 Gr · Ülker Çizi Peynir & Soğan Aromalı Kraker 40 Gr · Master Crunch Soğan & Sumak Çeşitleri Çıtır Kaplamalı Kızarmış Kaju 140 Gr
  B) Özel çeşit soğan (kırmızı / mor / gümüş / arpacık)  7 aday
       Kırmızı Soğan File 1 Adet · Gümüş Soğan File 1 Kg · Arpacık Soğan File 1 Adet
  C) Soğan halkası (hazır)                      4 aday
       İnci Soğan Halkası 450 Gr · Superfresh Gurme Soğan Halkası 450 Gr · Feast Gurme Soğan Halka 450 Gr
  D) Kuru soğan                                 4 aday
       Kuru Soğan 1 Kg · Kuru Soğan File 1 Kg · File Soğan 1 Kg
  E) Soğan tozu / granül                        3 aday
       Dünyahayat Soğan Granül 80 Gr · Bağdat Soğan Tozu 65 Gr · Bağdat Toz Soğan 38 Gr
  F) Doğranmış / dondurulmuş soğan              2 aday
       Superfresh Doğranmış Soğan 450 Gr · Feast Dondurulmuş Küp Soğan 1 Kg
  G) Taze / yeşil soğan                         2 aday
       Yeşil Soğan Demet 1 Adet · Taze Soğan 1 Demet
  H) Çıtır kaplamalı soğan                      1 aday
       Melis Çıtır Soğan 100 Gr
  I) Kurutulmuş soğan                           1 aday
       Hatice Teyze Kurutulmuş Soğan 100 Gr
  J) Soğan turşusu                              1 aday
       Melis Kırmızı Soğan Turşusu 340 Gr

KABUL   : D+G?
PRIMARY : D
NOT     : 

## 34/84 · patates   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Patates cipsi                             46 aday
       Ruffles Originals Sade Patates Cipsi 50 Gr · Amigo Düz Sade Patates Cipsi 150 Gr · Lorenz Ekşi Krema Aromalı Patates Cipsi 100 Gr
  B) Dondurulmuş hazır patates (parmak / çıtır) 14 aday
       Mutfağım Dondurulmuş Patates 1 Kg · Pek Jumbo Patates 1 Kg · Superfresh Patates 2.5 Kg
  C) Taze patates (kg / file / mini)            5 aday
       Patates File 1 Kg · Patates Taze 1 Kg · İnci Patates 1 Kg
  D) Kızartmalık / haşlamalık patates           3 aday
       Kızartmalık Patates 1 Kg · Kızartmalık Patates 1 Adet · Haşlamalık Patates 1 Kg
  E) Patates çeşnisi (baharat)                  2 aday
       Deva Cajun Patates Çeşnisi 60 Gr · Bağdat Cam Cajun Patates Çeşnisi 55 Gr
  F) Patates püresi (hazır)                     1 aday
       Knorr Patates Püresi 60 Gr
  G) Tatlı patates                              1 aday
       İthal Tatlı Patates 1 Kg

KABUL   : C+D+B?
PRIMARY : C
NOT     : 

## 35/84 · marul   ·   1 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Yıkanmış yaprak marul                      1 aday
       Eurofresh Yıkanmış Yaprak Marul 250 Gr

> UYARI: 2'den az grup — kararı anlamsızlaştırır

KABUL   : ATLA
PRIMARY : -
NOT     : 

## 36/84 · havuç   ·   13 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Havuç suyu / içecek                        7 aday
       Sizzle-Pop Stay Funny Havuç & Kırmızı Elma & Çilek 200 Ml · Exotic Portakal Havuç Suyu 300 Ml · Dimes Sıkma Havuç & Portakal Suyu 700 Ml
  B) Havuç püresi (bebek maması)                2 aday
       Hipp Organik Havuç Püresi 125 Gr · Gerber Organik Muzlu Havuç Balkabağı Püresi 90 Gr
  C) Havuç tarator (meze)                       2 aday
       Obur Chef Havuç Tarator 200 Gr · Gurmepack Havuç Tarator 200 Gr
  D) Havuç reçeli                               1 aday
       Atiye Laçin Portakal Havuç Reçeli 250 Gr
  E) Taze havuç                                 1 aday
       Havuç 1 Kg

KABUL   : E
PRIMARY : E
NOT     : 

## 37/84 · patlıcan   ·   28 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Közlenmiş / köz patlıcan                  13 aday
       Tada Közlenmiş Patlıcan 520 Gr · Fide Közlenmiş Patlıcan 650 Gr · Kühne Közlenmiş Patlıcan Salatası 520 Gr
  B) Patlıcan salatası / ezmesi (meze)          4 aday
       Obur Chef Patlıcan Ezme 200 Gr · Mezzet Patlıcan Ezme 200 Gr · Bizim Vatan Patlıcan Salatası 530 Gr
  C) Patlıcan kızartma (hazır)                  3 aday
       Tamek Patlıcan Kızartma 190 Gr · Tamek Patlıcan Kızartma 380 Gr · Tat Patlıcan Kızartma 400 Gr
  D) Kuru / kurutulmuş patlıcan                 3 aday
       Kuru Patlıcan Dizi 25 Adet · Kurutulmuş Dolmalık Patlıcan 18 Adet · Kuru Patlıcan
  E) Taze patlıcan                              3 aday
       Patlıcan 1 Kg · Kemer Patlıcan 1 Kg · Bostan Patlıcan 1 Kg
  F) Saç boyası (patlıcan moru)                 1 aday
       Palette Deluxe Saç Boyası 4-99 Patlıcan Moru 115 Ml
  G) Hazır patlıcan yemeği (dolma)              1 aday
       Burcu Hazır Yemek Patlıcan Dolma 200 Gr

KABUL   : E
PRIMARY : E
NOT     : 

## 38/84 · kabak   ·   26 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Kabak çekirdeği                           15 aday
       Çerezim Kabak Çekirdeği 165 Gr · Tadım Kabak Çekirdeği 180 Gr · Kabak Çekirdeği 1 Kg
  B) Kabak lifli sabun                          3 aday
       Like Me Kolajen Kabak Lifli Sabun 120 Gr · Like Me Aloe Vera Kabak Lifli Sabun 120 Gr · Balmy Kabak Lifli Sabun Amber Wood & White Musk 125 Gr
  C) Kabak tatlısı / reçeli                     2 aday
       Anadolu Lezzetleri Kıtır Kabak Tatlısı 800 Gr · Hatice Teyze Bal Kabağı Reçeli 300 Gr
  D) Bal kabağı                                 2 aday
       Mini Bal Kabağı 1 Adet · Dilimlenmiş Bal Kabağı 1 Kg
  E) Taze kabak (sakız)                         2 aday
       Kabak 1 Kg · Sakız Kabak 1 Kg
  F) Granola (kabak çekirdekli)                 1 aday
       Nesfit Kabak Çekirdekli Turna Yemişli Granola 300 Gr
  G) Kabak mücveri (hazır)                      1 aday
       Gurmepack Fırında Kabak Mücver 250 Gr

KABUL   : E
PRIMARY : E
NOT     : 

## 39/84 · sarımsak   ·   21 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sarımsak şampuanı / saç bakımı             4 aday
       Bioblas Botanic Oils Sarımsak Şampuanı 360 Ml · Bioblas Sarımsak & Keratin Şampuan 1 Lt · Tresan Sarımsak Onarıcı Bakım Şampuanı 300 Ml
  B) Sarımsak tozu / granül                     4 aday
       Bağdat Sarımsak Tozu 70 Gr · Bağdat Toz Sarımsak 48 Gr · Dünyahayat Sarımsak Öğütülmüş 120 Gr
  C) Taze / kuru sarımsak                       4 aday
       File Sarımsak 200 Gr · Sarımsak 1 Kg · Kuru Sarımsak 1 Kg
  D) Sarımsaklı gıda (peynir / hamsi / çeşni)   3 aday
       Knorr Fırında Tavuk Çeşnisi Baharat ve Sarımsak 34 Gr · Carrefour Sarımsak Soslu Hamsi Marine 200 Gr · Milgo Taze Sarımsak Ve Kekik Sürülebilir Peynir 180 Gr
  E) Sarımsak turşusu                           3 aday
       Melis Sarımsak Turşusu 180 Gr · Berrak Sarımsak Turşusu 340 Gr · Berrak Sarımsak Turşusu 340 Ml
  F) Siyah sarımsak                             1 aday
       The Black Garlic Siyah Sarımsak Püresi 100 Gr
  G) Sarımsak ezmesi                            1 aday
       Siha Sarımsak Ezmesi 90 Gr
  H) Sarımsak sosu                              1 aday
       Heinz Sarımsak Sosu 230 Gr

KABUL   : C
PRIMARY : C
NOT     : 

---

# Bakliyat & kuruyemiş

## 40/84 · mercimek   ·   64 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Kırmızı mercimek                          16 aday
       Anadolu Mutfağı Kırmızı Mercimek 1 Kg · Yayla Kırmızı Mercimek 2 Kg · Saban Yerli Kırmızı Mercimek 2.5 Kg
  B) Organik mercimek                          11 aday
       Doyum Organik Yeşil Mercimek 1 Kg · Carrefour Bio Organik Kırmızı Mercimek 1 Kg · Organik Gurme Organik Kırmızı Mercimek 1 Kg
  C) Yeşil mercimek                            11 aday
       Saban Yeşil Mercimek 1 Kg · Tat Yeşil Mercimek 1 Kg · Hasata Yozgat Sultani Yeşil Mercimek 1 Kg
  D) Mercimek cipsi / kraker / kavrulmuş       10 aday
       Yummate Ranch Aromalı Mercimek Cipsi 50 Gr · Vegeats Tuzlu Ve Sirke Aromalı Mercimek Cipsi 50 Gr · Lestello Glutensiz Mercimek Patlağı 135 Gr
  E) Mercimek çorbası (hazır)                   8 aday
       Piyale Mercimek Çorbası 72 Gr · Knorr Çabuk Mercimek Çorbası 22 Gr · Bizim Mutfak Mercimek Çorbası 54 Gr
  F) Mercimekli makarna                         3 aday
       Potamya Sarı Mercimek Penne 240 Gr · Potamya Sarı Mercimek Fusilli Makarna 240 Gr · Bonatelli Organik Yeşil Mercimek Çubuk Makarna 400 Gr
  G) Sarı mercimek                              2 aday
       Yayla Sarı Mercimek 1 Kg · Reis Sarı Mercimek 1 Kg
  H) Mercimek unu                               1 aday
       Reis Glutensiz Kırmızı Mercimek Unu 500 Gr
  I) Filizlendirilmiş mercimek                  1 aday
       The Good Wild Filizlendirilmiş Yeşil Mercimek 175 Gr
  J) Beluga mercimeği                           1 aday
       Reis Royal Beluga Mercimeği 500 Gr

KABUL   : A+B+C+G
PRIMARY : A
NOT     : 

## 41/84 · nohut   ·   50 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Nohut cipsi / patlağı                     17 aday
       Sriracha Yoğurt Nane Glutensiz Nohut Cipsi 50 Gr · Züber Noutos Fırınlanmış Nohut Cips Kajun Baharatlı 55 Gr · Hero Goodies Süt Mısırlı Karabuğday Nohut Cipsi 30 Gr
  B) Haşlanmış / konserve nohut                 9 aday
       Bizim Vatan Haşlanmış Nohut 800 Gr · Yayla Haşlanmış Nohut 700 Gr · Tat Haşlanmış Nohut 800 Gr
  C) Organik nohut                              6 aday
       Mlife Bio Organik Nohut 1 Kg · Doyum Organik Nohut 1 Kg · Sade Organik Nohut 1 Kg
  D) Kuru nohut                                 6 aday
       Saban Nohut 1 Kg · Rençber Nohut 1 Kg · Reis Nohut 1 Kg
  E) Koçbaşı / iri boy nohut                    5 aday
       Tat Koçbaşı Nohut 8.5 Mm 1 Kg · Reis Koçbaşı Nohut 1 Kg · Duru Koçbaşı Nohut 8 mm 1 Kg
  F) Beyaz nohut                                5 aday
       Carrefour Beyaz Nohut 1 Kg · Saban Beyaz Nohut 1 Kg · Reis Royal Beyaz Nohut 500 Gr
  G) Nohut unu                                  1 aday
       Reis Glutensiz Nohut Unu 500 Gr
  H) Etli nohut (hazır yemek)                   1 aday
       Tada Etli Nohut 250 Gr

KABUL   : D+B+C
PRIMARY : D
NOT     : 

## 42/84 · fasulye   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Dermason / şeker / battal / horoz kuru fasulye 17 aday
       Yöremce Dermason Fasulye 1 Kg · Reis Dermason Fasulye 1 Kg · Anadolu Lezzetleri İspir Kuru Fasulye 500 Gr
  B) Haşlanmış / konserve fasulye              13 aday
       Duru Haşlanmış Fasulye 400 Gr · Tat Haşlanmış Fasulye 800 Gr · Yayla Haşlanmış Fasulye 700 Gr
  C) Taze / dondurulmuş fasulye                 9 aday
       Ayşekadın Fasulye 1 Kg · Tat Taze Fasulye 810 Gr · Superfresh Barbunya Fasulye 450 Gr
  D) Maş / meksika / kırmızı / siyah fasulye    8 aday
       Yayla Gurme Maş Fasulye 500 Gr · Reis Royal Maş Fasulye 500 Gr · Larina Meksika Fasulyesi 400 Gr
  E) Genel kuru fasulye                         6 aday
       Yurt Kuru Fasulye 400 Gr · Anadolu Mutfağı Kuru Fasulye 1 Kg · Tat Fasulye Cam 670 Gr
  F) Fasulye pilaki (hazır yemek)               5 aday
       Burcu Fasulye Pilaki 400 Gr · Tat Fasulye Pilaki 400 Gr · Tukaş Fasulye Pilaki 400 Gr
  G) Organik kuru fasulye                       5 aday
       Carrefour Bio Organik Dermason Fasulye 1 Kg · Sade Organik Kuru Fasulye 1 Kg · Organik Gurme Organik Kuru Fasulye 1 Kg
  H) Etli / pastırmalı hazır kuru fasulye       4 aday
       Yurt Hazır Kuru Fasulye Yemeği 400 Gr · Yayla Etli Kuru Fasulye 250 Gr · Annemin Mutfağı Pastırmalı Kuru Fasulye 200 Gr
  I) Diğer fasulye ürünü (turşu / sos / filiz)  3 aday
       De&co Fasulye Filizi 400 Gr · Lee Kum Kee Siyah Fasulye Sos 226 Gr · Sera Fasulye Turşusu 700 Gr
  J) Zeytinyağlı fasulye (meze)                 2 aday
       Tat Zeytinyağlı Fasulye 380 Gr · Tada Vegan Zeytinyağlı Taze Fasulye 250 Gr

KABUL   : E+A+B
PRIMARY : E
NOT     : 

## 43/84 · barbunya   ·   22 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Barbunya pilaki (hazır yemek)             12 aday
       Bizim Vatan Barbunya Pilaki 400 Gr · Duru Pratik Barbunya Pilaki 3.2 Kg · Tat Barbunya Pilaki 400 Gr
  B) Kuru barbunya                              6 aday
       Barbunya 1 Kg · Duru Barbunya 1 Kg · Reis Barbunya 1 Kg
  C) Haşlanmış barbunya                         3 aday
       Bizim Vatan Haşlanmış Barbunya 800 Gr · Tat Haşlanmış Barbunya 800 Gr · Tamek Haşlanmış Barbunya 800 Gr
  D) Dondurulmuş barbunya                       1 aday
       Superfresh Barbunya Fasulye 450 Gr

KABUL   : B+C
PRIMARY : B
NOT     : 

## 44/84 · ceviz   ·   22 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Ceviz içi                                 12 aday
       Carrefour Çiğ Ceviz İçi 70 Gr · Carrefour Ceviz İçi 150 Gr · Peyman Bahçeden İç Ceviz 140 Gr
  B) Cevizli ürün (ezme / quark / granola)      5 aday
       Carrefour Bio Organik Ceviz İncir Ezmesi 25 Gr · Sek Quark İncir Ceviz 140 Gr · Wefood Glutensiz Granül Kuru İncir Ceviz 250 Gr
  C) Kabuklu ceviz                              2 aday
       Ceviz İnce Kabuklu 1 Kg · Kabuklu Ceviz 1 Kg
  D) Kırık ceviz içi                            2 aday
       Simbat Ekonomik Kırık Ceviz İçi 400 Gr · Simbat İri Kırık Ceviz İçi 400 Gr
  E) Kelebek ceviz içi                          1 aday
       Ceviz İçi Kelebek 250 Gr

KABUL   : B hariç HEPSİ
PRIMARY : A
NOT     : 

## 45/84 · fındık   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Gofret / bisküvi / çikolata / draje       26 aday
       Ülker Çikolata Fındık Rüyası 40 Gr · Kahve Dünyası Sütlü Çikolatalı Fındık Draje 60 Gr · Wafermaster Crepe Fındık Krema Gofret 216 Gr
  B) Fındık ezmesi                             14 aday
       Amigo %70 Fındık Ezmesi 300 Gr · Torku Fındık Ezmesi 370 Gr · Sarelle Kakaolu Fındık Ezmesi 350 Gr
  C) Fındık kreması (sürülebilir)              12 aday
       Ülker Fındık Rüyası Kakaolu Fındık Kreması Cam Kavanoz 350 Gr · Sayley Sütlü Fındık Kreması 500 Gr · Nutella Kakaolu Fındık Kreması 630 Gr
  D) Kavrulmuş fındık                           4 aday
       Tadım Kavrulmuş Fındık İçi 180 Gr · Kavrulmuş Fındık 270 Gr · Migros Kavrulmuş Fındık İçi 150 Gr
  E) Çiğ fındık                                 4 aday
       Çerezya Çiğ Fındık 150 Gr · Carrefour Çiğ Fındık 150 Gr · Mlife Çiğ İç Fındık 200 Gr
  F) Fındık içi (genel)                         4 aday
       Fındık İçi 1 Kg · B-5 Çerez Fındık 40 Gr · Tadım Fındık İçi 90 Gr
  G) Fındık yağı                                3 aday
       Çotanak Fındık Yağı 1 Lt · Çotanak Fındık Yağı 2 Lt · Çotanak Fındık Yağı 5 Lt
  H) Fındık sütü / içeceği                      2 aday
       Fomilk Şekersiz Fındık Sütü 1 Lt · Alpro Fındık Sütü 1 Lt
  I) Tuzlu / kaplamalı fındık                   2 aday
       Çerezya Tuzlu Fındık 150 Gr · Carrefour Susam Kaplamalı Fındık 80 Gr
  J) Kıyılmış / dilimlenmiş fındık              1 aday
       Şenocak Kıyılmış Fındık 100 Gr

KABUL   : E+F
PRIMARY : F
NOT     : 

## 46/84 · badem   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Badem dondurma                            33 aday
       Mis Gold Badem 100 Ml · Algida Magnum Mini Badem Dondurma 345 Ml · Magnum Mini Classic Badem Beyaz Dondurma 345 Ml
  B) Çikolata / draje / kraker / bar / granola 10 aday
       Buono Badem Keyfi Badem Draje 150 Gr · Kahve Dünyası Tambol Badem Krokan Dolgulu Sütlü Çikolata 100 Gr · Fropie Elma Badem Granola 360 Gr
  C) Çiğ badem                                 10 aday
       Badem Çiğ İç 1 Kg · Çiğ Badem İçi 300 Gr · Peyman Bahçeden Çiğ Badem 140 Gr
  D) Badem içi (genel)                          6 aday
       Amigo Badem İçi 150 Gr · Emsal Dilimlenmiş Badem 100 Gr · Carrefour Badem İçi 90 Gr
  E) Badem sütü / içeceği                       4 aday
       Fomilk Şekersiz Badem Sütü 1 Lt · Alpro Yulaf & Badem İçeceği 1 Lt · Alpro Vanilya Badem İçeceği 1 Lt
  F) Kavrulmuş badem                            3 aday
       Kavrulmuş İç Badem 300 Gr · Badem İçi Kavrulmuş 1 Kg · By İzzet Kavrulmuş Badem 150 Gr
  G) Badem unu                                  2 aday
       Noi Badem Unu 250 Gr · Wefood Badem Unu 250 Gr
  H) Badem ezmesi                               2 aday
       Zentis Badem Ezmesi 100 Gr · Koska Light Badem Ezmesi 100 Gr
  I) Duş jeli (badem aromalı)                   1 aday
       Palmolive Soft Essence Badem Duş Jeli 500 Ml
  J) Badem helvası                              1 aday
       Koska Badem Aromalı Helva 1 Kg

KABUL   : C+D+F
PRIMARY : D
NOT     : 

## 47/84 · leblebi   ·   16 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Beyaz leblebi                              5 aday
       Carrefour Beyaz Leblebi 150 Gr · Simbat Beyaz Leblebi 200 Gr · Tadım Beyaz Leblebi 180 Gr
  B) Sarı leblebi                               3 aday
       Amigo Sarı Leblebi 200 Gr · Simbat Sarı Leblebi 200 Gr · Çerezim Sarı Leblebi 200 Gr
  C) Çifte kavrulmuş leblebi                    2 aday
       Migros Çifte Kavrulmuş Sarı Leblebi 200 Gr · Tadım Çifte Kavrulmuş Sarı Leblebi 180 Gr
  D) Tuzlu leblebi                              2 aday
       Master Nut Tuzlu Leblebi 160 Gr · Tadım Tuzlu Sarı Leblebi 180 Gr
  E) Şeker leblebi                              1 aday
       Çerezim Şeker Leblebi 150 Gr
  F) Crispy / kaplamalı leblebi                 1 aday
       B-5 Çerez Crispy Leblebi 30 Gr
  G) Benekli leblebi                            1 aday
       Master Nut Benekli Leblebi 160 Gr
  H) Genel leblebi                              1 aday
       Anadolu Lezzetleri Ağın Leblebisi 230 Gr

KABUL   : E+F+G hariç HEPSİ
PRIMARY : A
NOT     : 

---

# Yağ & sos

## 48/84 · yağ   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Yağ çözücü / sökücü (temizlik)            24 aday
       Güldal Yağ Çöz Sprey 750 Ml · Cif Yağ Çözücü Sprey Anında Etki 1 Lt · Cif Perfect Power Ocak & Fırın Sprey 435 Ml
  B) Saç bakım yağı / şampuan / serum          21 aday
       Pantene Hindistan Cevizi Özlü Yağ 100 Ml · L'Oréal Paris Elseve Mucizevi Yağ Saç Güzelleştirici Krem 100 Ml · Ogx Yenileyici Argan Oil Of Morocco 100 Ml
  C) Bebek yağı                                 6 aday
       Johnson's Bebek Yağı 200 Ml · Dalin Nem & Koruma Yağı 300 Ml · Johnson's Aloe Vera Bebek Yağı 500 Ml
  D) Özel yemeklik yağ (susam / keten / çörekotu / aspir)  5 aday
       Gürata Safflower Aspir Yağı 1 Lt · Oneva Keten Tohumu Yağı 250 Ml · Oneva Çörekotu Yağı 250 Ml
  E) Sürülebilir yağ / ghee / sade yağ          5 aday
       Lurpak Tuzsuz Sürülebilir Yağ 250 Gr · Vtr Sade Yağ 350 Gr · Hasmandıra Ghee İnek Sade Yağ 300 Gr
  F) Bronzlaştırıcı / vücut yağı                4 aday
       Eda Taşpınar Yoğun Bronzlaştırıcı Yağ 50 Ml · Eda Taşpınar Yoğun Bronzlaştırıcı Yağ 200 Ml · Eda Taşpınar Bronzlaştırıcı Koruyucu Yağ 200 Ml
  G) Yağ emici kağıt havlu                      3 aday
       Selpak Yağ Emici Kağıt Havlu 8 Adet · Selpak Yağ Emici Havlu 8 Adet · Selpak Yağ Emici Havlu 6 Adet
  H) Zeytinyağı                                 3 aday
       Komili Lezzetli Yumuşak Sızma Zeytinyağı 1 Lt · Tariş Naturel Sızma Zeytinyağı 2 Lt · Tariş Riviera Zeytinyağı 2 Lt
  I) Bitkisel yağ serisi                        1 aday
       Organix Bitkisel Yağ Serisi 50 Ml

KABUL   : HİÇBİRİ
PRIMARY : farketmez
NOT     : Ayçiçek Yağı aramasındaki sonuçların esas alınması önemli, gıda anlamında yağ araması buradakilere cevap bulamaz.

## 49/84 · zeytinyağı   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sızma zeytinyağı (genel)                  25 aday
       Komili Lezzetli Yumuşak Sızma Zeytinyağı 1 Lt · Tariş Kuzey Ege Sızma Zeytinyağı 750 Ml · Yudum Egemden Sızma Zeytinyağı Yoğun Lezzet 2 Lt
  B) Riviera zeytinyağı                        19 aday
       Orkide Riviera Zeytinyağı 1 Lt · Tariş Riviera Zeytinyağı 2 Lt · Komili Riviera Yemeklik Zeytinyağı 2 Lt
  C) Naturel sızma zeytinyağı                  15 aday
       Komili Natürel Sızma Zeytinyağı 1 Lt · Migros Naturel Sızma Zeytinyağı 5 Lt · Olivepia Altınözü Naturel Sızma Zeytinyağı 1 Lt
  D) Organik zeytinyağı                         4 aday
       Kristal Organik Sızma Zeytinyağı 500 Ml · Carrefour Bio Organik Naturel Sızma Zeytinyağı 500 Ml · Tariş Organik Naturel Sızma Zeytinyağı 500 Ml
  E) Soğuk sıkım zeytinyağı                     3 aday
       Kristal Soğuk Sıkım Zeytinyağı 500 Ml · Asiltane Soğuk Sıkım Naturel Sızma Zeytinyağı 500 Ml · Olimilas Mature Soğuk Sıkım Zeytinyağı 500 Ml
  F) Sprey zeytinyağı                           2 aday
       Yudum Egemden Sprey Riviera Zeytinyağı 250 Ml · Tariş Sprey Naturel Sızma Zeytinyağı 250 Ml
  G) Aromalı zeytinyağı (mantarlı / sarımsaklı)  2 aday
       Monini Porcini Mantarlı Zeytinyağı 250 Ml · Monini Sarımsaklı Ve Acı Biberli Zeytinyağı 250 Ml
  H) Genel zeytinyağı                           2 aday
       Ege Masalı Yadigar Zeytinyağı 500 Ml · Olivya Gökovacık Zeytinyağı 500 Ml

KABUL   : F+G hariç HEPSİ
PRIMARY : A
NOT     : 

## 50/84 · zeytin   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Siyah zeytin                              25 aday
       İnci Siyah Zeytin 321-380 Kalibre 250 Gr · Lio Salamura Siyah Zeytin 381-460 2 Kg · Cem Siyah Zeytin 261-290 Kalibre 1 Kg
  B) Kırma / çizik yeşil zeytin                13 aday
       Zeo S Çizik Yeşil Zeytin 400 Gr · Cem Çizik Zeytin 201-230 Kalibre 1 Kg · Fora Yeşil Çizik Zeytin 291-350 1 Kg
  C) Genel zeytin                              12 aday
       Marmarabirlik Mega Zeytin 500 Gr · Marmarabirlik Extra Zeytin 500 Gr · Fora Edremit Zeytin 351-380 1 Kg
  D) Kuru sele / sele zeytin                    8 aday
       Lio Siyah Zeytin Kuru Sele (351-380) 500 Gr · Cem Yağlı Sele Zeytin 351-380 200 Gr · Fora Kuru Sele Siyah Zeytin 350 Gr
  E) Dilimli zeytin                             3 aday
       Fora Dilimli Yeşil Zeytin 160 Gr · Fora Siyah Zeytin Dilimli 160 Gr · Cem Dilimli Siyah Zeytin 300 Gr
  F) Zeytin ezmesi                              2 aday
       Marmarabirlik Sade Zeytin Ezmesi 340 Gr · Fora Sade Siyah Zeytin Ezmesi 175 Gr
  G) Zeytin salatası                            2 aday
       Zertum Organik Yeşil Zeytin Salatası 290 Gr · Sosero Ege Zeytin Salatası 290 Gr
  H) Dolgulu zeytin                             2 aday
       Nutruit Olipop Portakal Kabuğu Dolgulu Yeşil Zeytin 30 Gr · İnci Kırmızı Biber Dolgulu Yeşil Zeytin 400 Gr
  I) Izgara zeytin                              2 aday
       Fora Izgara Yeşil Zeytin 230 Gr · İnci Izgara Yeşil Zeytin 261-320 Kalibre 200 Gr
  J) Yeşil zeytin                               2 aday
       İnci Baharat Çeşnisiz Yeşil Zeytin 250 Gr · Haktat Biberli Yeşil Zeytin 400 Gr
  K) Çekirdeksiz zeytin                         1 aday
       Komili Çekirdeksiz Izgara Yeşil Sele Zeytin 17 Adet

KABUL   : A+B+C+D+H+I+J+K
PRIMARY : A
NOT     : 

## 51/84 · salça   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Domates salçası                           28 aday
       Yurdum Salça 28-30 Briks 830 Gr · Yurda Domates Salçası 830 Gr · Bizim Vatan Domates Salçası 4.3 Kg
  B) Tatlı biber salçası                        9 aday
       Migros Tatlı Biber Salçası 700 Gr · Bizim Vatan Tatlı Biber Salçası 650 Gr · Tat Köy Tatlı Biber Salçası 550 Gr
  C) Domates rendesi / rendelenmiş              7 aday
       Merko Gusdo Rendelenmiş Domates 700 Gr · Tamek Domates Rendesi 685 G · Sade Organik Rendelenmiş Domates 345 Gr
  D) Acı biber salçası                          7 aday
       Bizim Vatan Acı Biber Salçası 650 Gr · Burcu Acı Biber Salçası 600 Gr · Tat Acı Biber Salçası 550 Gr
  E) Doğranmış / soyulmuş domates               5 aday
       Gusdo Merko Doğranmış Domates 400 Gr · Tat Doğranmış Domates 400 Gr · Demko Soyulmuş Domates 400 Gr
  F) Organik salça                              5 aday
       Sade Organik Biber Salçası 610 Gr · City Farm Organik Domates Salçası 650 Gr · Burcu Organik Domates Salçası 600 Gr
  G) Domates püresi                             4 aday
       Tamek Domates Püresi 210 Gr · Tukaş Domates Püresi 700 Gr · Migros Domates Püresi 700 Gr
  H) Biber salçası (genel)                      4 aday
       Öncü Biber Salçası Acı Cam 700 Gr · Tukaş Biber Salçası Cam 700 Gr · Öncü Biber Salçası Tatlı Cam 700 Gr
  I) Karışık domates-biber salçası              3 aday
       Öncü Domates Biber Karışık Salça 900 Gr · Burcu Biber Domates Salçası 600 Gr · Tat Köy Domates/Biber Salçası 560 Gr

KABUL   : A+B+D+F+H+I
PRIMARY : A
NOT     : 

## 52/84 · sirke   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Elma sirkesi                              14 aday
       Fıçı Elma Sirkesi 750 Ml · Migros Elma Sirkesi 750 Ml · Kemal Kükrer Elma Sirkesi 1 Lt
  B) Üzüm sirkesi                              14 aday
       Fıçı Üzüm Sirkesi 750 Ml · Migros Üzüm Sirkesi 750 Ml · Fersan Üzüm Sirkesi 2 Lt
  C) Beyaz sirke                               12 aday
       Carrefour Beyaz Sirke 1 Lt · Kühne Sirke Beyaz Karbonatlı 1 Lt · Ferfresh Beyaz Sirke 2 Lt
  D) Diğer sirke (alıç / pirinç / ananas / malt / bal)  8 aday
       Chefline Pirinç Sirkesi 150 Ml · Kemal Kükrer Yudumluk Dört Hırsız Sirkesi 500 Ml · Wefood Ananas Sirkesi 500 Ml
  E) Balsamik sirke                             7 aday
       Fersan Yaban Mersinli Balsamik Sirke 250 Ml · Kühne Balsamik Sirke 250 Ml · Acetum Balsamik Sirkesi 500 Ml
  F) Organik sirke                              7 aday
       Happylife Organik Sirke Cam 500 Ml · Fersan Organik Alıç Sirkesi 500 Ml · Organik Gurme Elma Sirkesi 500 Ml
  G) Detoks sirkesi                             5 aday
       Fersan Detox Doğal Sirke Analı Üzüm Sirkesi 500 Ml · Fersan Detoks Bal Sirkesi 490 Ml · Fersan Detoks Aronya Sirkesi 490 Ml
  H) Temizlik ürünü (sirke özlü)                4 aday
       Miss Arap Sabunu + Sirke Özlü Temizleyici 1 Lt · Rinso Beyaz Sirke Ve Çamaşır Sodası Beyaz Toz 6 Kg · Rinso Beyaz Sirke & Çamaşır Sodası Toz Deterjan 10 Kg
  I) Cips (sirke aromalı)                       1 aday
       Vegeats Tuzlu Ve Sirke Aromalı Mercimek Cipsi 50 Gr

KABUL   : H+I hariç HEPSİ
PRIMARY : C
NOT     : 

## 53/84 · mayonez   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Aromalı mayonez (sarımsaklı / trüflü / sriracha / acılı) 24 aday
       Hellmann's Acılı Mayonez 230 Gr · Heinz Pesto Mayonez 225 Gr · Thai World Sriracha Mayo 460 Gr
  B) Sade mayonez                              24 aday
       Tukaş Mayonez 840 Gr · Heinz Mayonez 505 Gr · Heinz Cam Mayonez 460 Gr
  C) Ketçap + mayonez seti                     11 aday
       Burcu Ketçap Mayonez Seti 1.2 Kg · Tat Aile Paketi Ketçap 900 Gr + Az Yağlı Mayonez 780 Gr · Calve Ketçap 610 Gr + Mayonez 540 Gr İkili Set
  D) Diğer sos / sirke (mayonez değil)         10 aday
       Crying Thaiger Sriracha Mayonez Acı Biber Sosu 200 Gr · Kühne Üzüm Sirkesi 500 Ml · Amoy Pirinç Sirkesi 750 Ml
  E) Ketçap (mayonez değil)                     2 aday
       Heinz Organik Ketçap 580 Gr · Tat Sıkı Dostlar Ketçap 1.21 Kg & Mayonez 1.21 Kg
  F) Light / az yağlı mayonez                   1 aday
       Heinz Light Mayonez 420 Gr

KABUL   : B+F?+A?
PRIMARY : B
NOT     : 

## 54/84 · ketçap   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sade ketçap                               18 aday
       Tukaş Ketçap 1 Kg · Calve Ketçap 430 Gr · Heinz Ketçap Cam 342 Gr
  B) Diğer sos / sirke (ketçap değil)          13 aday
       Fıçı Limon Suyu 750 Ml · Kühne Ballı Hardal 255 Gr · Amoy Pirinç Sirkesi 750 Ml
  C) Ketçap + mayonez seti                     11 aday
       Hellmann's Ketçap 460 Gr + Mayonez 385 Gr İkili Set · Calvé Ketçap/Mayonez Orta Set 810 Ml · Calve Ketçap 610 Gr + Mayonez 540 Gr İkili Set
  D) Acı ketçap                                 9 aday
       Bolbol Acı Ketçap 1 Kg · Tat Acılı Ketçap 390 Gr · Tat Katkısız Acı Ketçap 650 Gr
  E) Cips / çerez (ketçap aromalı)              6 aday
       Master Puff Ketçap Çeşnili Mısır Çerezi 90 Gr · Ruffles Ketçap Aromalı 125 Gr · Cipso Tırtıklı Ketçap Aromalı Patates Cipsi 160 Gr
  F) Tatlı ketçap                               6 aday
       Bizim Vatan Tatlı Ketçap 500 Gr · Tat Tatlı Ketçap 650 Gr · Tat Katkısız Tatlı Ketçap 650 Gr
  G) Aromalı ketçap (pickle / sweet chili / cajun / sarımsaklı)  5 aday
       Tat Ketçap Pickle 390 Gr · Tat Sweet Chili Ketçap 390 Gr · Tat Ketçap Cajun Spice 390 Gr
  H) Mayonez (ketçap değil)                     2 aday
       Tat Sıkı Dostlar Ketçap 1.21 Kg & Mayonez 1.21 Kg · Heinz Cam Mayonez 460 Gr
  I) Organik ketçap                             2 aday
       Heinz Organik Ketçap 580 Gr · Sade Organik Tatlı Ketçap 280 Gr

KABUL   : A
PRIMARY : A
NOT     : 

## 55/84 · tahin   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Tahin helvası                             26 aday
       Gülsan Sade Tahin Helvası 500 Gr · Gülsan Kakaolu Tahin Helvası 500 Gr · Torku Antep Fıstıklı Tahin Helva 500 Gr
  B) Tahin + pekmez karışımı / seti            16 aday
       Koska Süper İkili Tahin Pekmez Karışımı 40 Gr · Carrefour Tahin 1.07 Kg + Pekmez 1.07 Kg Set · Servet Keçiboynuzu Pekmezi 400 Gr
  C) Sade tahin                                14 aday
       Carrefour Tahin 290 Gr · Şitoğlu Cam Tahin 600 Gr · Pol's Gurme Yerli Susam Tahin 500 Gr
  D) Organik tahin                              6 aday
       Wefood Organik Tahin 300 Gr · City Farm Organik Sıkma Kapak Tahin 350 Gr · City Farm Organik Tahin 350 Gr
  E) Çifte kavrulmuş tahin                      5 aday
       Taşkale Çifte Kavrulmuş Tahin 600 Gr · Pol's Gurme Çifte Kavrulmuş Tahin 500 Gr · Servet Şekerleme Tek Kavrulmuş Fethiye Tahini 300 Gr
  F) Tahin kreması                              3 aday
       Maksilla Sütlü Tahin Kreması 350 Gr · Maksilla Kakaolu Tahin Kreması 350 Gr · Maksilla Aronyalı Tahin Kreması 250 Gr
  G) Çikolatalı tahin karışımı                  1 aday
       Koska Çikos Çikolata Tahin Karışım 240 Gr
  H) Esmer / kabuklu susam tahini               1 aday
       Koska Kabuklu Susamdan Esmer Tahin 300 Gr

KABUL   : C
PRIMARY : C
NOT     : 

---

# Tatlandırıcı & baharat

## 56/84 · şeker   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Toz şeker                                 29 aday
       Bor Şeker Toz Şeker 1 Kg · Toz Şeker 1 Kg · Gül Aras Toz Şeker 1 Kg
  B) Şekerleme / yumuşak şeker (tatlı)         16 aday
       Polonya Meyve Aromalı Şeker 23 Gr · Bebeto Yumuşak Şeker Sakız 280 Gr · Cavendish & Harvey Elma Dolgulu Frenk Üzümlü Şeker 175 Gr
  C) Küp şeker                                 10 aday
       Carrefour Küp Şeker 750 Gr · Nar Küp Şeker 1 Kg · Balküpü Elite Küp Şeker 750 Gr
  D) Kahverengi / esmer şeker                   9 aday
       Carrefour Kahverengi Toz Şeker 500 Gr · Irmak Kahverengi Toz Şeker 500 Gr · Carrefour Kahverengi Küp Şeker 500 Gr
  E) Sargılı küp şeker                          4 aday
       Carrefour Sargılı Küp Şeker 500 Gr · Irmak Tekli Sargılı Küp Şeker 500 Gr · Altınküp Tek Sargılı Küp Şeker 750 Gr
  F) Kristal toz şeker                          2 aday
       Türkşeker Kristal Toz Şeker 5 Kg · Tatküpü Kristal Toz Şeker 5 Kg
  G) Stick toz şeker                            1 aday
       Altınküp Stick Toz Şeker 500'lü 500x4 Gr
  H) Dökme şeker                                1 aday
       Kent Dökme Şeker 1 Kg

KABUL   : A+C+F
PRIMARY : A
NOT     : 

## 57/84 · tuz   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Kaya / deniz tuzu                         20 aday
       Billur Tuz Değirmen Sofrada Öğütme Deniz Tuzu 200 Gr · City Farm Değirmen Deniz Tuzu 350 Gr · Maldon Kalahari Çöl Tuzu 250 Gr
  B) Himalaya tuzu                             16 aday
       Billur Tuz Sofrada Öğütme Himalaya Tuzu 200 Gr · Purelife Himalaya Tuzu Pembe İyotlu İnce 500 Gr · Purelife Himalaya Tuzu Beyaz Sofrada Öğütme 500 Gr
  C) İyotlu sofra tuzu                         16 aday
       Sofra İyotlu Tuz 750 Gr · Billur Tuz İyotlu 3 Kg · Salina İyotlu Sofra Tuzu 1.5 Kg
  D) Baharatlı / aromalı tuz                    6 aday
       Tuzot Sade Tuz Baharat Karışımı 200 Gr · Efsina Refika'dan Finishing Salt Flakes Barbecue 140 Gr · Efsina Refika'dan Finishing Salt Flakes Original 140 Gr
  E) Bulaşık makinesi tuzu                      3 aday
       Finish Tuz 1.5 Kg · Mintax Bulaşık Makinesi Tuzu 1.5 Kg · Bingo Bulaşık Makinesi Tuzu 1.5 Kg
  F) İri salamura tuzu                          3 aday
       Salina İri Salamura Tuzu 1.5 Kg · Pak Tuz İri Salamura Tuz 3 Kg · Anadolu Mutfağı İri Salamura Tuzu 3 Kg
  G) Özel tuz (iyotsuz / sodyumu azaltılmış / mineralli)  3 aday
       Billur Tuz İyotsuz Sofra Tuzu 250 Gr · Billur Tuz Demir Mineralli İyotlu Tuz 500 Gr · Billur Sodyumu Azaltılmış Tuz 500 Gr
  H) Sofrada öğütme / değirmen tuzu             2 aday
       Ta-Ze Sofrada Öğütme Tuzu 500 Gr · Maldon Sofrada Öğütme Tuzu 250 Gr
  I) Genel tuz                                  2 aday
       Anadolu Mutfağı Tuz 750 Gr · Billur Tuz 1.5 Kg
  J) Tuz ruhu (temizlik)                        1 aday
       Jet Süper Kokusuz Tuz Ruhu 700 Ml

KABUL   : C+I
PRIMARY : C
NOT     : 

## 58/84 · bal   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Çiçek balı / süzme bal                    36 aday
       Sivas Birlik Çiçek Süzme Bal 460 Gr · Anavarza Çiçek Balı 850 Gr · Balparmak Yüksek Yayla Çiçek Balı 850 Gr
  B) Çam / kestane balı                        10 aday
       Kozan Kooperatif Çam Balı 460 Gr · Bee'o Çam Balı 300 Gr · Balparmak Kestane Balı 460 Gr
  C) Cips / bar / dondurma (bal aromalı)        7 aday
       Eti Gong Pops Bal & Hardal Aromalı 80 Gr · Yummies Bal Badem Dondurma 350 Ml · Dr. Oetker Vitalis Knusper Plus Bal Bademli 450 Gr
  D) Ballı ürün (sirke / propolis / reçel)      4 aday
       Mlife Bitki Özlü Bal Propolis Karışım 49 Gr · Fer Organik Propolisli Arı Sütü Bal Polen 240 Ml · Mlife 2 Dakika 2 Vitamin Bal Propolis Karışım 49 Gr
  E) Saç boyası (bal rengi)                     3 aday
       Hope Saç Boyası 8.3 Bal Köpüğü 1 Adet · Palette Natural Colors Saç Boyası 7-0 Bal 1 Adet · Sea Color Saç Boyası Seti 8.3 Bal Köpüğü 1 Adet
  F) Bal kabağı                                 3 aday
       Mini Bal Kabağı 1 Adet · Dilimlenmiş Bal Kabağı 1 Kg · Hatice Teyze Bal Kabağı Reçeli 300 Gr
  G) Petek / karakovan balı                     3 aday
       Kızıldağ İmranlı Petek Bal 430 Gr · Kızıldağ İmranlı Petek Bal 900 Gr · Fer Bal Karakovan Balı 1 Kg
  H) Organik bal                                2 aday
       Kaldera Organik Bal 460 Gr · Fer Organik Kestane Balı 450 Gr
  I) Genel bal                                  2 aday
       Anavarza Kral Şakir Lisanslı Tüp Bal 40 Gr · Balparmak Yayla ve Ova Balı 460 Gr
  J) Sabun (ballı)                              1 aday
       Hacı Şakir Kalıp Sabun Zeytinyağı Ve Bal 4x150 Gr
  K) Krem bal                                   1 aday
       Anavarza Krem Bal 200 Gr

KABUL   : A+G?
PRIMARY : A
NOT     : 

## 59/84 · pekmez   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Helva (pekmez değil)                      19 aday
       Koska Sade Helva 200 Gr · Torku Sade Tahin Helvası 200 Gr · Koska Gurme Fıstıklı Helva 400 Gr
  B) Tahin + pekmez karışımı / seti            13 aday
       Koska Süper İkili Tahin Pekmez Karışımı 40 Gr · Migros Tahin 470 Gr + Pekmez 600 Gr · Lokman Üzüm Pekmezi 500 Gr + Tahin 400 Gr
  C) Üzüm pekmezi                              12 aday
       Carrefour Üzüm Pekmezi 390 Gr · Koska Üzüm Pekmezi 380 Gr · Koska Üzüm Pekmezi 700 Gr
  D) Organik pekmez                            10 aday
       City Farm Organik Keçiboynuzu Pekmezi 450 Gr · Organik Gurme Organik Üzüm Pekmezi 380 Gr · Organik Gurme Organik Hurma Pekmezi 380 Gr
  E) Tahin (pekmez değil)                       5 aday
       Koska Tahin 620 Gr · Serel Çifte Kavrulmuş Tahin 1 Kg · Pol's Gurme Yerli Susam Tahin 500 Gr
  F) Keçiboynuzu / harnup pekmezi               5 aday
       Carrefour Harnup Pekmezi 390 Gr · Migros Keçiboynuzu Pekmezi 800 Gr · Serel Harnup Pekmezi 800 Gr
  G) Dut pekmezi                                4 aday
       Koska Dut Pekmezi 380 Gr · Servet Dut Pekmezi 400 Gr · Koska Dut Pekmezi 700 Gr
  H) Keçiboynuzu özü                            3 aday
       Koska Keçiboynuzu Özü 310 Gr · Şitoğlu Keçiboynuzu Özü 640 Gr · Yenigün Keçiboynuzu Özü 640 Gr
  I) Hurma pekmezi                              1 aday
       Yenigün Hurma Pekmezi 800 Gr

KABUL   : C
PRIMARY : C
NOT     : 

## 60/84 · karabiber   ·   18 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Tane karabiber                             7 aday
       Anadolu Mutfağı Tane Karabiber 50 Gr · Carrefour Selection Tane Karabiber 50 Gr · Dünyahayat Karabiber Tane 115 Gr
  B) Genel karabiber                            7 aday
       Destan Karabiber 75 Gr · Bağdat Karabiber 40 Gr · Deva Karabiber 60 Gr
  C) Öğütülmüş / toz karabiber                  4 aday
       Bağdat Karabiber Öğütülmüş 65 Gr · Bağdat Öğütülmüş Karabiber 55 Gr · Dünyahayat Karabiber Öğütülmüş 125 Gr

KABUL   : B+C
PRIMARY : B
NOT     : 

## 61/84 · pul biber   ·   25 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Genel pul biber                           15 aday
       Anadolu Mutfağı Kırmızı Pul Biber 75 Gr · Knorr Pul Biber 65 Gr · Pul Biber 1 Kg
  B) Acı / ekstra acı pul biber                 6 aday
       Edalı Acı Pul Biber 75 Gr · Bağdat Ekstra Acı Pul Biber 80 Gr · Müsan Kahramanmaraş Acı Kırmızı Pul Biber 200 Gr
  C) İsot biber                                 2 aday
       Bağdat İsot Biber 80 Gr · Deva İsot Biber 65 Gr
  D) Ekonomik paket pul biber                   2 aday
       Knorr Ekonomik Pul Biber 200 Gr · Bağdat Pul Biber Ekonomik 210 Gr

KABUL   : A+B
PRIMARY : A
NOT     : 

## 62/84 · kimyon   ·   8 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Öğütülmüş kimyon                           8 aday
       Anadolu Mutfağı Kimyon 75 Gr · Deva Kimyon 65 Gr · Dünyahayat Kimyon 125 Gr

> UYARI: 2'den az grup — kararı anlamsızlaştırır

KABUL   : ATLA
PRIMARY : -
NOT     : 

---

# İçecek

## 63/84 · su   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Büyük boy su (3 – 10 L)                   21 aday
       Su 1.5 Lt · Erikli Su 6 Lt · Erikli Su 10 Lt
  B) Sade pet su                               19 aday
       Su 500 Ml · Güzelpınar Su 500 Ml · Erikli Su 1 Lt
  C) Doğal mineralli su                        11 aday
       Assu Mineralli Su 500 Ml · Saka Doğal Mineralli Su 1.5 Lt · Saka Doğal Mineralli Su 6x1.5 Lt
  D) Çoklu paket / koli                         9 aday
       Su 60x180 Ml · Erikli Su 12x0.5 Lt · Erikli Su Avantajlı Paket 6x1.5 Lt
  E) Premium su                                 7 aday
       Uludağ Premium Su 400 Ml · Damla Premium Su 750 Ml · Erikli Premium Su 750 Ml
  F) Lisanslı / figürlü su                      2 aday
       Hayat Su Looney Tunes 330 Ml · Hayat Su Batman & Superman 330 Ml
  G) Spor kapak / cam şişe su                   2 aday
       Hayat Su Spor Kapak 750 Ml · Hayat Uludağ Cam Su 750 Ml
  H) Bebek suyu                                 1 aday
       Hayat Su Bebek 1.98 Lt

KABUL   : B+A+E+G
PRIMARY : B
NOT     : 

## 64/84 · çay   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Siyah çay (rize / tiryaki / harman / filiz) 31 aday
       Çaykur Çay Çiçeği 200 Gr · Migros Harman Siyah Çay 1 Kg · Ofçay Arhavi Çay 1 Kg
  B) Yeşil çay                                 20 aday
       Deren Yumuşak İçimli Yeşil Çay 20 Adet · Si&Ha Yeşil Çay 100 Gr · Beta Sencha Yeşil Çay 50 Gr
  C) Poşet çay (demlik / bardak / süzen)        5 aday
       Herdem Demlik Poşet Siyah Çay 48x3.2 Gr · Ofçay Hazine Filiz Demlik Poşet Çay 450 Gr · Çaykur Bardak Poşet Çay 25'li 50 Gr
  D) Matcha çay                                 4 aday
       Doğadan Mango Aromalı Matcha Çay 25 Gr · Doğadan Antep Fıstığı Aromalı Matcha Yeşil Çay Tozu 25 Gr · Herby Premium Matcha Çilek Ve Vanilya Aromalı Çay 25 Gr
  E) Beyaz çay                                  3 aday
       Doğadan Sade Beyaz Çay 18 Adet · Doğadan Portakal Çiçekli Beyaz Çay 36 Gr · Doğadan Beyaz Çay Portakal Çiçeği 18 Adet 31 Gr
  F) Form / bitki / probiyotik çayı             3 aday
       Doğadan Kiraz Saplı Form Çay 20 Adet · Doğadan Form Çay Kiraz Saplı 20 Adet 36 Gr · Doğadan Probiyotikli Rooibos Vanilya Çay 24 Gr
  G) Aromalı siyah çay (earl grey / bergamot)   3 aday
       Deren Earl Grey Fincan Poşet Çay 25 Adet · Migros Bergamot Aromalı Siyah Çay 500 Gr · Ahmad Tea English Breakfast Bardak Poşet Çay 25 Adet
  H) Dökme çay                                  2 aday
       Ofçay Tiryaki Dökme Çay 1 Kg · Ofçay Hazine Dökme Çay 1 Kg
  I) Granül / CTC çay                           1 aday
       Beta Granül CTC Çay 50 Gr

KABUL   : A+B+C
PRIMARY : A
NOT     : 

## 65/84 · kahve   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Filtre kahve                              18 aday
       Lezzcafe Filtre Kahve 250 Gr · Migros Filtre Kahve Etiyopya 225 Gr · Bonheur Guatemala Filtre Kahve 250 Gr
  B) Granül / çözünebilir (instant) kahve      12 aday
       Carrefour Gold Kahve 100 Gr · Carrefour Klasik Kahve 100 Gr · Jacobs Cronat Gold Kahve 100 Gr
  C) 3'ü 1 arada / hazır kahve karışımı        10 aday
       Starbucks Cappuccino Premium Kahve Karışımı 18 Gr · Starbucks White Mocha Kahve Karışımı 24 Gr · Mahmood 3ü1 Arada Kahve 24x18 Gr
  D) Çekirdek kahve                            10 aday
       Jacobs Crema Çekirdek Kahve 500 Gr · Bonheur Çekirdek Kahve 250 Gr · Tchibo Latin Grande Çekirdek Kahve 500 Gr
  E) Kahve beyazlatıcısı / kreması              8 aday
       Migros Kahve Beyazlatıcısı 200 Gr · Nescafé Coffee Mate Kahve Kreması 200 Gr · Coffee Mate Kahve Beyazlatıcısı 200 Gr
  F) Kapsül kahve                               5 aday
       Cafissimo Espresso Vanilla Kapsül Kahve 10 Adet · L'or Espresso 08 Lungo Profondo Kapsül Kahve 10 Adet 52 Gr · Cafissimo Espresso Caramel Kapsül Kahve 10 Adet
  G) Öğütülmüş kahve                            3 aday
       Juan Valdez Volcan Arabica Öğütülmüş Kahve 250 Gr · Juan Valdez Single Origin Huila Öğütülmüş Kahve 283 Gr · Starbucks House Blend Öğütülmüş Kahve 200 Gr
  H) Kafeinsiz kahve                            2 aday
       Tchibo Exclusive Decaf Filtre Kahve 250 Gr · Nescafé Gold Kafeinsiz Kahve 100 Gr
  I) Türk kahvesi / dibek                       2 aday
       Hisar Kahve Damla Sakızlı Türk Kahvesi 100 Gr · Tarihi Adıyaman Dibek Kakule Kahve 200 Gr
  J) Genel kahve                                2 aday
       Moliendo Guatemala Antigua Kahve 250 Gr · Moliendo Ravello Espresso Blend Kahve 1 Kg

KABUL   : B+A+C+D
PRIMARY : B
NOT     : 

## 66/84 · kola   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Klasik kola                               32 aday
       Sarıyer Kola Gazlı İçecek 250 Ml · Coca-Cola Gazlı İçecek 1.5 Lt · Coca-Cola Gazlı İçecek 2.5 Lt
  B) Şekersiz / zero / light kola              24 aday
       Crown Şekersiz Kola Kutu 330 Ml · Coca-Cola Şekersiz Gazlı İçecek 200 Ml · Coca-Cola Zero Sugar Şişe 6x250 Ml
  C) Jelibon / şekerleme (kola aromalı)         9 aday
       Chupa Chups Melody Pops Kola 15 Gr · Ülker Yupo Jelly Kola Aromalı Yumuşak Şeker 80 Gr · Haribo Happy Kola Aromalı Yumuşak Şekerleme 200 Gr
  D) Çoklu paket / koli                         6 aday
       Pepsi Kola 4x1 Lt · Pepsi Kutu 4x330 Ml · Coca-Cola Gazlı İçecek Karma Paket 4x1 Lt
  E) Aromalı kola (twist)                       1 aday
       Pepsi Twist 1 Lt

KABUL   : A
PRIMARY : A
NOT     : 

## 67/84 · meyve suyu   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Meyveli içecek / nektar                   30 aday
       Tamek Meyvelim Vişne Meyveli İçecek 200 Ml · Pfanner Morning Boost Karışık Meyveli İçecek 2 Lt · Pfanner Vitamin & Magnezyum Katkılı Karışık İçecek 2 Lt
  B) Diğer meyve bazlı içecek                  11 aday
       Söğütlüçeşme Limon C Vitaminli 6x200 Ml · Sizzle-Pop Summer Champ Şeftali Elma Ananas 200 Ml · Oui Voila Red Mix 414 Ml
  C) Aromalı içecek (meyve suyu değil)          7 aday
       Juss Fesleğen Tohumlu Aromalı İçecek 250 Ml · Zen Fesleğen Aromalı İçecek Basil 250 Ml · Dimes Ananas Aromalı İçecek 200 Ml
  D) Organik meyve suyu                         6 aday
       Hipp Organik Karışık Meyve Suyu 200 Ml · Mlife Organik Vişne Suyu 330 Ml · Mlife Organik İncir Elma Suyu 330 Ml
  E) Mocktail / kokteyl içecek                  4 aday
       Okf Coco Drink 500 Ml · Froods Vai Vai Mocktail 330 Ml · Froods Moscow Mule Mocktail 330 Ml
  F) Soğuk çay (fuse tea)                       4 aday
       Fuse Tea Mango Ve Ananas Aromalı İçecek 1.5 Lt · Fuse Tea Karpuz Aromalı İçecek 1.5 Lt · Fuse Tea Kavun Ve Çilek Aromalı İçecek 1 Lt
  G) Detoks içeceği                             4 aday
       Tazeyim Detox Orman Meyveleri Suyu 150 Ml · Elite Detox Defence 200 Ml · Elite Detox Skinny 200 Ml
  H) Meyve suyu                                 4 aday
       Uludağ Meyvelim Mandalina 1 Lt · Exotic Nar Suyu 300 Ml · Exotic Greyfurt Suyu 750 Ml
  I) %100 / sıkma meyve suyu                    2 aday
       Dimes %100 Tropik Meyveler Suyu 1 Lt · Naren %100 Sıkma Kırmızı Meyveler Suyu 720 Ml

KABUL   : A+D+I
PRIMARY : A
NOT     : 

## 68/84 · maden suyu   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Aromalı / meyveli maden suyu              39 aday
       Kızılay Limonlu Maden Suyu 200 Ml · Avşar Yeşil Elmalı Maden Suyu 200 Ml · Avoya Meyveli Elma Ve Adaçayı Maden Suyu 6 Adet
  B) Sade maden suyu                           16 aday
       Beypazarı Doğal Maden Suyu 200 Ml · Sırma Maden Suyu 1 Lt · Akmina Sade Maden Suyu 1 Lt
  C) Çoklu paket / koli                        14 aday
       Kızılay Doğal Maden Suyu 6x200 Ml · Saka Doğal Maden Suyu 6x200 Ml · Kızılay Afyon Doğal Maden Suyu 6x200 Ml
  D) Premium / signature maden suyu             3 aday
       Uludağ Premium Maden Suyu 250 Ml · Uludağ Premium Maden Suyu 750 Ml · Avoya Signature Doğal Maden Suyu 750 Ml

KABUL   : B
PRIMARY : B
NOT     : 

## 69/84 · soda   ·   11 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Çamaşır sodası (temizlik)                  5 aday
       Ernet Çamaşır Sodası 500 Gr · Soda Plus Çamaşır Sodası 500 Gr · Rinso Beyaz Sirke & Çamaşır Sodası Toz Deterjan 10 Kg
  B) Cream soda (aromalı gazlı içecek)          4 aday
       Lol Cream Soda Vanilya Aromalı Gazlı İçecek 250 Ml · Lol Cream Soda Salted Caramel Aromalı Gazlı İçecek 250 Ml · Lol Cream Soda Çilek Aromalı Gazlı İçecek 250 Ml
  C) Sade soda                                  2 aday
       San Pellegrino Soda 250 Ml · San Pellegrino Soda 750 Ml

KABUL   : C
PRIMARY : C
NOT     : 

---

# Dünya mutfağı

## 70/84 · soya sosu   ·   24 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sade soya sosu                            13 aday
       Chefline Soya Sosu 150 Ml · Amoy Soya Sosu 150 Ml · Kikkoman Soya Sosu 150 Ml
  B) Az tuzlu / sodyumu azaltılmış soya sosu    7 aday
       Amoy Tuzu Azaltılmış Soya Sosu 150 Ml · Aiko Tuzu Azaltılmış Soya Sosu 250 Ml · Kikkoman Az Tuzlu Soya Sosu 250 Gr
  C) Glutensiz soya sosu                        1 aday
       Chefline Glutensiz Soya Sosu 150 Ml
  D) Organik soya sosu                          1 aday
       Kikkoman Organik Soya Sosu 150 Ml
  E) Acı soya sosu                              1 aday
       Kühne Acı Soya Sosu 250 Ml
  F) Koyu soya sosu                             1 aday
       Signature Koyu Soya Sosu 150 Ml

KABUL   : HEPSİ
PRIMARY : A
NOT     : 

## 71/84 · köri   ·   15 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Köri noodle (hazır)                        7 aday
       Indomie Köri Noodle 75 Gr · Indomie Tavuk Köri Tavuk Noodle 75 Gr · Indomie Köri Çeşnili Noodle 5x75 Gr
  B) Köri baharatı                              5 aday
       Anadolu Mutfağı Köri 35 Gr · Deva Köri 60 Gr · Knorr Köri 65 Gr
  C) Köri sos                                   3 aday
       Calve Köri Sos 260 Gr · Gurmepack Köri Soslu Tavuk & Fusilli Makarna 360 Gr · Sharwood's Madras Köri Sos 420 Gr

KABUL   : B+C
PRIMARY : B
NOT     : 

## 72/84 · mozzarella   ·   12 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Mozzarellalı sandviç (hazır)               3 aday
       Mr. No Gurme Mozzarella Jambon Sandviç 145 Gr · Mr. No Gurme Mozzarella Jambon Üçgen Sandviç 145 Gr · Tada Gurme Sandviç Mozzarella Dana Jambonlu 160 Gr
  B) Rende mozzarella                           3 aday
       Mis Rende Mozzarella Peyniri 150 Gr · Bahçıvan Rende Mozzarella Peyniri 200 Gr · President Rende Mozzarella Peyniri 200 Gr
  C) Mozzarellalı pizza (hazır)                 2 aday
       Dr. Oetker Guseppe Mozzarella Pizza 412 Gr · Dr. Oetker Ristorante Mini Mozzarella 4 Adet 560 Gr
  D) Suda / top mozzarella                      2 aday
       Bahçıvan Suda Top Mozzarella 125 Gr · Bahçıvan Suda Mozzarella 125 Gr
  E) Mozzarella çubukları (kızartmalık)         1 aday
       Superfresh Mozzarella Peyniri Çubukları 280 Gr
  F) Genel mozzarella peyniri                   1 aday
       President Mozzarella Peyniri 600 Gr

KABUL   : F+B
PRIMARY : F
NOT     : 

## 73/84 · parmesan   ·   6 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Grana padano parmesan                      2 aday
       Cibus Grana Padano Parmesan Peynir 125 Gr · Bahçıvan Grana Padano Parmesan 200 Gr
  B) Vegan parmesan alternatifi                 1 aday
       Trakya Çiftliği Vegan Parmesan Tadında 200 Gr
  C) Toz / rende parmesan                       1 aday
       Grana Padano Toz Parmesan 100 Gr
  D) Eritme parmesan                            1 aday
       Castelli Yarım Yağlı Taze Eritme Parmesan Peyniri 200 Gr
  E) Genel parmesan peyniri                     1 aday
       Primavera Parmesan Peyniri 200 Gr

KABUL   : E+D+C
PRIMARY : E
NOT     : 

## 74/84 · noodle   ·   55 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Bardak noodle                             10 aday
       Dudomi Bardak Noodle 60 Gr · Indomie Köri Çeşnili Bardak Noodle 60 Gr · Dudomi Kremalı Körili Tavuk Çeşnili Bardak Noodle 80 Gr
  B) Çoklu paket noodle                         9 aday
       Indomie Tavuk Çeşnili Noodle 5x70 Gr · Dudomi Körili Noodle 10x70 Gr · Indomie Sebze Aromalı Noodle 5 Adet
  C) Köri aromalı noodle                        8 aday
       Dudomi Körili Noodle 70 Gr · Noodlex Köri Çeşnili Noodle 70 Gr · Indomie Tavuk Körili Noodle 75 Gr
  D) Diğer aromalı noodle (spesiyal / soya / tom yum)  8 aday
       Indomie Special Noodle 75 Gr · Dudomi Peynirli Jalapeno Noodle 80 Gr · Indomie Gurme Soya Soslu Hazır Noodle 80 Gr
  E) Tavuk aromalı noodle                       6 aday
       Indomie Tavuk Noodle 70 Gr · Noodlex Tavuk Aromalı Noodle 70 Gr · Dudomi Tavuk Çeşnili Noodle 60 Gr
  F) Jumbo noodle                               4 aday
       Indomie Jumbo Tavuk Aromalı Hazır Noodle 120 Gr · Indomie Tavuklu Jumbo Hazır Noodle 120 Gr · Indomie Jumbo Körili Hazır Noodle 120 Gr
  G) Erişte (Çin / Kore usulü)                  3 aday
       Dolco Egg Noodle Çin Eriştesi 350 Gr · Baixiang Baharatlı Dana Çorbası Aromalı Erişte 111 Gr · Kore Usulü Hindi Aromalı Erişte 112 Gr
  H) Sebze aromalı noodle                       3 aday
       Indomie Sebzeli Noodle 75 Gr · Indomie Special Sebzeli Noodle 75 Gr · Indomie Sebze Spesiyal Hazır Noodle 75 Gr
  I) Egg noodle (kuru)                          2 aday
       Nudo Egg Noodle 350 Gr · Chefline Egg Noodle 350 Gr
  J) Vegan / tam buğdaylı noodle                2 aday
       Nudo Vegan Noodle 350 Gr · Nudo Tam Buğdaylı Noodle 350 Gr

KABUL   : HEPSİ
PRIMARY : A
NOT     : 

## 75/84 · tortilla   ·   48 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Tortilla                                  16 aday
       Tandoor Tortilla Lavaş 650 Gr · Aly Tortilla Lavaş Tam Buğdaylı 25 Cm 6lı 390 Gr · Unabella Tortilla Tam Buğdaylı 25 Cm 10 Adet
  B) Genel lavaş                               13 aday
       Lavaş 200 Gr · Fit Ekmek Lavaş Ekmek Çeşitleri 300 Gr · Untad Lavaş 8li 560 Gr
  C) Tandır / sac ekmeği lavaş                  9 aday
       Tamköy Sac Ekmeği 1 Adet · Uno Anadolu Tandır Lavaş 6 Adet · Uno Tandır Lavaş 6'lı 282 Gr
  D) Taco kabuğu / shells                       3 aday
       Casamexico Tako Kabuğu 250 Gr · Aly Taco Kabuğu 90 Gr · Aly Taco Shells 135 Gr
  E) Tam buğday lavaş                           3 aday
       Uno Tam Buğday Lavaş 5li 325 Gr · Untad Premium Tam Buğday Unlu Lavaş 8 Adet 560 Gr · Lavalia Tam Buğdaylı Lavaş 25 Cm 9 Adet 630 Gr
  F) Tortilla cipsi                             2 aday
       Fiesta Tortilla Cips 450 Gr · Poco Loco Tortilla Cips 450 Gr
  G) Glutensiz lavaş                            1 aday
       Schar Gluten Free Lavash 2x80 Gr
  H) Dürümlük lavaş                             1 aday
       Nimet Dürümlük Lavaş 200 Gr

KABUL   : A+B+C+E+H
PRIMARY : A
NOT     : 

## 76/84 · hummus   ·   6 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Aromalı humus (falafelli / köz biberli)    2 aday
       Yeşil Şef Falafelli Humus 200 Gr · Yeşil Şef Köz Biberli Humus 200 Gr
  B) Klasik humus                               2 aday
       Mezzet Humus 200 Gr · Yeşil Şef Klasik Humus 200 Gr
  C) Humus kraker (atıştırmalık)                1 aday
       The Good Wild Humus Kraker 55 Gr
  D) Kıtır ekmekli humus seti                   1 aday
       Mr. No Köz Biberli Kıtır Ekmekli Humus 130 Gr

KABUL   : A+B
PRIMARY : B
NOT     : 

## 77/84 · pesto   ·   24 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Pesto makarna sosu                        11 aday
       Pesto & Trüf Mantarı & Cheddar Kremalı Sos 190 Gr · Pastavilla Pesto Makarna Sosu 190 Gr · Sacla Domates Ricotta ve Peynirli Pesto Sos 350 Gr
  B) Pesto soslu hazır yemek                    4 aday
       Lezita Pesto Soslu Izgara Dilim Piliç Fileto 200 Gr · Tada Gurme Izgara Tavuklu Pesto Soslu Sandviç 170 Gr · Dardanel Kolay Pişir Karides Pesto Soslu Linguine 300 Gr
  C) Cips / çerez (pesto aromalı)               3 aday
       Amigo Pesto Sos Çeşnili Patates Cipsi 200 Gr · Patito Pesto Barbekü Aromalı Patates Cipsi 200 Gr · Master Crunch Pesto Soslu Çıtır Kaplamalı Kızarmış Fındık 140 Gr
  D) Pesto soslu süt ürünü (labne / taze peynir)  2 aday
       İçim Pesto Soslu Labne 180 Gr · Trakya Çiftliği Pesto Soslu Zeytinyağlı Taze Peynir 200 Gr
  E) Genel pesto                                2 aday
       Barilla Pesto Alla Genovese 190 Gr · Barilla Pesto Alla Siciliana 190 Gr
  F) Pesto mayonez                              1 aday
       Heinz Pesto Mayonez 225 Gr
  G) Hazır çabuk makarna                        1 aday
       Knorr Çabuk Makarna Pesto Fusilli 65 Gr

KABUL   : E+A
PRIMARY : A
NOT     : 

---

# Temizlik & kağıt

## 78/84 · deterjan   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Toz deterjan                              39 aday
       Bingo Konsantre Toz Deterjan 1.5 Kg · Artmatik Renkli Toz Deterjan 8 Kg · Omo Act Fresh Beyazlar Toz Deterjan 5.5 Kg
  B) Sıvı deterjan                             26 aday
       Migros Sıvı Deterjan Renkliler 1.5 Lt · Rinso Argan Sıvı Deterjan 2.5 Lt · Rinso Kömür Komple Bakım Sıvı Deterjan 2.5 Lt
  C) Hassas / hipoalerjenik deterjan            3 aday
       Qualt Sıvı Deterjan Hassas 3 Lt · Omo Liquid Biosensitive Sıvı Deterjan 1.5 Lt · Omo Express Fresh Hipoalerjenik Sıvı Deterjan 1.48 Lt
  D) Jel deterjan                               2 aday
       Persil Power Jel Color Sıvı Deterjan 1.69 Lt · Persil Jel Deterjan Okyanus Ferahlığı 38 Yıkama 2.47 Lt
  E) Bebek deterjanı                            1 aday
       Uni Baby Sensitive Deterjan 1.5 Lt
  F) Elde yıkama deterjanı                      1 aday
       Mintax Elde Yıkama Toz Deterjan 1 Kg

KABUL   : A+B
PRIMARY : A
NOT     : 

## 79/84 · bulaşık deterjanı   ·   52 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Kokulu / aromalı bulaşık deterjanı        28 aday
       Mintax Sıvı Bulaşık Deterjanı Limonlu 750 Ml · Fairy Limon Bulaşık Deterjanı 650 Ml · Fairy Temiz Ve Ferah Elma Kokulu Elde Yıkama Bulaşık Deterjanı 1.5 Lt
  B) Sıvı bulaşık deterjanı                     8 aday
       Desto Sıvı Bulaşık Deterjanı 750 Ml · Pril Sıvı Bulaşık Deterjanı 5 Kg · Fairy Soğuk Suda Etkili Sıvı Bulaşık Deterjanı 1.5 Lt
  C) Genel bulaşık deterjanı                    6 aday
       Fairy Bulaşık Deterjanı 650 Ml · Fairy Bulaşık Deterjanı 2.6 Lt · Pril Bulaşık Deterjanı 4 Kg
  D) Losyon bulaşık deterjanı                   4 aday
       Migros Losyon Sıvı Bulaşık Deterjanı 750 Ml · Mintax Sıvı Bulaşık Deterjanı Losyon 750 Ml · Pril Aloe Vera Losyon Bulaşık Deterjanı 750 Ml
  E) Hassas / sensitive bulaşık deterjanı       3 aday
       Bingo Sensitive Bulaşık Deterjanı 1.5 Lt · Bingo Sensitive Elde Bulaşık Deterjanı 650 Ml · U Green Clean Sensitive Elde Bulaşık Deterjanı 500 Ml
  F) Bitkisel / eco / bio bulaşık deterjanı     3 aday
       Carrefour Eco Planet Limon Bitkisel Sıvı Bulaşık Deterjanı 750 Ml · Sır Bio Bulaşık Deterjanı Pompalı 1 Lt · Carrefour Eco Planet Aloe Vera Bitkisel Sıvı Bulaşık Deterjanı 750 Ml

KABUL   : HEPSİ
PRIMARY : C
NOT     : 

## 80/84 · çamaşır suyu   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Parfümlü / kokulu çamaşır suyu            28 aday
       Migros Parfümlü Çamaşır Suyu 1 Lt · Carrefour Parfümlü Çamaşır Suyu 2.5 Lt · Domestos Beyaz Sabun Hijyenik Çamaşır Suyu 1.85 Lt
  B) Ultra / yoğun çamaşır suyu                24 aday
       Mintax Yoğun Çamaşır Suyu 1 Lt · Hyper Hypo Beyaz Sabun Ultra Çamaşır Suyu 750 Ml · Domestos Ultra Kar Beyazı Çamaşır Suyu 3.24 Lt
  C) Klasik çamaşır suyu                        9 aday
       Ace Klasik Çamaşır Suyu 1 Lt · Ace Klasik Çamaşır Suyu Lavanta 4 Lt · Ace Klasik Çamaşır Suyu Ekstra Hijyen 4 Lt
  D) Köpük çamaşır suyu                         4 aday
       Sır Hijyen Köpük Çamaşır Suyu Katkılı 750 Ml · Domestos Köpük Gücü Kar Beyaz Çamaşır Suyu 450 Ml · Hypo Beyaz Sabun Köpük Çamaşır Suyu 750 Ml
  E) Jel / kıvamlı çamaşır suyu                 3 aday
       Ace Ultra Kıvamlı Çamaşır Suyu Okaliptüs 750 Ml · Ace Ultra Dağ Tazeliği Kıvamlı Çamaşır Suyu 750 Ml · Mr Muscle Köpüren Jel Çamaşır Suyu Marine 750 Ml
  F) Mutfak çamaşır suyu                        2 aday
       Domestos Bio Active Mutfak Çamaşır Suyu 750 Ml · Domestos Bio Active Mutfak Çamaşır Suyu 1.85 Lt
  G) Lavabo açıcı                               1 aday
       Hypo Ultra Lavabo Açıcı Çamaşır Suyu 750 Gr
  H) Bitkisel çamaşır suyu                      1 aday
       U Green Clean Bitkisel Çamaşır Suyu 1 Lt

KABUL   : C+B+A+D
PRIMARY : C
NOT     : 

## 81/84 · peçete   ·   62 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Sade peçete                               13 aday
       Confort Peçete 200 Adet · Beyaz Güvercin Peçete 200 Adet · Selis Peçete 30x30 cm 100'lü 100 Adet
  B) Kağıt mendil (genel)                      12 aday
       Blume 3 Katlı Kağıt Mendil 10 Adet · Beyaz Güvercin Pratik Mendil 150 Adet · Selpak Losyonlu Mendil 10 Adet
  C) Desenli / temalı peçete                    9 aday
       Queen Desenli Peçete 20 Adet · Selpak Trend Peçete 20 Adet · Sofia Kumaş Dokulu Peçete Beyaz 25 Adet
  D) Kutu mendil                                8 aday
       Selpak Butik Kutu Mendil 48 Adet · Selpak Kutu Mendil 50 Adet · Selpak Maxi Kutu Mendil 1 Adet
  E) Sunum / servis peçetesi                    6 aday
       Cepli Sunum Peçete 33x40 Cm 20 Adet · Soft Baskılı Sunum Peçetesi 40x40 Cm 20 Adet · Servis Peçetesi 200 Adet
  F) Premium / extra peçete                     6 aday
       Selpak Peçete Extra 20 Adet · Solo Süper Peçete 200 Yaprak 1 Adet · Beyaz Güvercin Premium Peçete 50 Adet
  G) Cep mendili                                4 aday
       Carrefour Cep Mendil 15 Adet · Selpak Cep Mendili 6 Adet · Sofia Cep Mendili 8 Adet
  H) Çek-al mendil                              4 aday
       Papia Platinum 4 Katlı Çek-Al Mendil 125 Adet · Familia Plus Natural Çek Al Mendil 150 Adet · Selpak Çek-Al Mendil 100 Adet

KABUL   : A+C+E+F
PRIMARY : A
NOT     : 

## 82/84 · tuvalet kağıdı   ·   47 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Geri dönüşüm / eko / natural tuvalet kağıdı 12 aday
       Blume Nature 2 Katlı Tuvalet Kağıdı 8 Adet · Yeşil Beyaz Eko Çift Katlı Tuvalet Kağıdı 8 Adet · Familia Plus Natural Tuvalet Kağıdı 32 Adet
  B) Genel tuvalet kağıdı                      11 aday
       Confort Tuvalet Kağıdı 16 Adet · Sofia Tuvalet Kağıdı 16 Adet · Mare Tuvalet Kağıdı 32 Adet
  C) Bambu katkılı tuvalet kağıdı               6 aday
       Süper Maylo Bambu Katkılı Tuvalet Kağıdı 40 Adet · Solo Tuvalet Kağıdı 2 Katlı Bambu 16 Adet · Solo Bambu Tuvalet Kağıdı 48 Adet
  D) 2 / çift katlı tuvalet kağıdı              5 aday
       Blume Çift Katlı Tuvalet Kağıdı 16 Adet · Carrefour Çift Katlı Tuvalet Kağıdı 32 Adet · Selis Çift Katlı Tuvalet Kağıdı 16'lı 16 Adet
  E) 3 katlı tuvalet kağıdı                     4 aday
       Selpak 3 Katlı Tuvalet Kağıdı 16 Adet · Selis 3 Katlı Tuvalet Kağıdı 12'li Adet · Viva Selection 3 Katlı Tuvalet Kağıdı 12 Adet
  F) Parfümlü / pudralı tuvalet kağıdı          3 aday
       Queen Parfümlü 3 Katlı Tuvalet Kağıdı 12 Adet · Selis Parfümlü 3 Katlı Tuvalet Kağıdı 12'li 12 Adet · Carrefour 3 Katlı Pudralı Tuvalet Kağıdı 12 Adet
  G) Pamuk / kaşmir katkılı tuvalet kağıdı      3 aday
       Selpak Deluxe Pamuk Katkılı Tuvalet Kağıdı 32 Adet · Selpak Kaşmir Katkılı Tuvalet Kağıdı 16 Adet · Selpak Pamuk Katkılı Tuvalet Kağıdı 32 Adet
  H) 4 katlı tuvalet kağıdı                     2 aday
       Papia Tuvalet Kağıdı 4 Katlı 32 Adet · Papia 4 Katlı Platinum Tuvalet Kağıdı 16 Adet
  I) Islak tuvalet kağıdı                       1 aday
       Minies Islak Tuvalet Kağıdı 60 Adet

KABUL   : HEPSİ
PRIMARY : B
NOT     : 

## 83/84 · şampuan   ·   72 aday · 35 depo

Aday havuzundaki ürün türleri:

  A) Genel şampuan                             22 aday
       A Plus Premium Bakım Şampuan 600 Ml · İpek Normal Saçlar İçin Şampuan 480 Ml · Clear Cool Sport Menthol Şampuan 350 Ml
  B) Bitkisel / yağ özlü şampuan               16 aday
       İpek Yağ Hazinesi Şampuan 480 Ml · Urban Care Expert Biotin Caffeine Şampuan 350 Ml · Ogx Düzleştirici Brazilian Keratin Smooth Şampuan 385 Ml
  C) Nem / parlaklık şampuanı                  13 aday
       Elidor Superblend Güçlü Ve Parlak Şampuan 400 Ml · Elseve Glycolic Gloss Şampuan 300 Ml · Elidor Ultra Işıltı 100 Şampuan 400 Ml
  D) Onarıcı / yıpranmış saç şampuanı           6 aday
       Gliss Ultimate Repair Şampuan 400 Ml · İpek Yıpranmış Saçlar Şampuan 480 Ml · Gliss Serum Deep Repair Şampuan 400 Ml
  E) Kepek karşıtı şampuan                      5 aday
       Pantene Kepek Karşıtı Şampuan 400 Ml · Hobby Kepeğe Karşı Şampuan 500 Ml · Elidor Kepeğe Karşı Şampuan 400 Ml
  F) Erkek şampuanı                             4 aday
       İpek Men Dökülme Karşıtı Şampuan 480 Ml · İpek Men Tüm Saçlar İçin Şampuan 480 Ml · Clear Men Maksimum Ferahlık Limon Özlü Şampuan 350 Ml
  G) Dökülme karşıtı şampuan                    3 aday
       İpek Dökülen Saçlar Şampuan 480 Ml · Restorex Saç Dökülmesine Karşı Şampuan 500 Ml · Elidor Dökülme Karşıtı Şampuan 400 Ml
  H) Kuru şampuan                               1 aday
       Urban Care It's So High Kuru Şampuan 200 Ml
  I) Duş jeli + şampuan                         1 aday
       Old Spice Captain Duş Jeli Ve Şampuan 400 Ml
  J) Renk koruyucu / mor şampuan                1 aday
       Elseve Turunculaşma Karşıtı Mor Şampuan 200 Ml

KABUL   : A+D+E+F+G+I
PRIMARY : A
NOT     : 

## 84/84 · sabun   ·   72 aday · 35 depo · sınav

Aday havuzundaki ürün türleri:

  A) Sıvı sabun                                26 aday
       Saloon Sıvı Sabun 500 Ml · Dalan Sıvı Sabun Leylak 1.5 Lt · U Green Clean Sıvı Sabun 2.75 Lt
  B) Zeytinyağlı sabun                         13 aday
       Dalan Antik Zeytinyağlı Sabun 170 Gr · Duru Zeytinyağlı Sıvı Sabun 1.5 Lt · Duru Saf Ve Doğal Yeşil Zeytinyağlı Sabun 600 Gr
  C) Kalıp / katı sabun                        10 aday
       Ebru Klasik Kalıp Beyaz Sabun 4x200 Gr · Hacı Şakir Kalıp Sabun Leylak 4x150 Gr · Hacı Şakir Gül Kalıp Sabun 4x150 Gr
  D) Genel sabun                                9 aday
       Ebru Sabun Leylak 375 Gr · Ebru Sabun Gül 375 Gr · Duru Fresh Sens Ocean Breeze Sabun 750 Gr
  E) Köpük sabun                                4 aday
       Dalin Orman Meyveli Köpük Sabun 200 Ml · Dalin Mango Ve Portakal Kokulu Köpük Sabun 200 Ml · U Green Clean Köpük Sabun 450 Ml
  F) Yüz sabunu / cream bar                     4 aday
       Sebamed Clear Face Kompakt Sabun 100 Gr · Palmolive Massage Sabun 150 Gr · Dove Original Cream Bar Katı Sabun 4x90 Gr
  G) Antibakteriyel / hassas sabun              4 aday
       Protex Sıvı Sabun Ultra 1.5 Lt · Activex Hassas Sıvı Sabun 1.5 Lt · Activex Aktif Antibakteriyel Sıvı Sabun 500 Ml
  H) Kabak lifli sabun                          2 aday
       Like Me Kolajen Kabak Lifli Sabun 120 Gr · Balmy Kabak Lifli Sabun Amber Wood & White Musk 125 Gr

KABUL   : HEPSİ
PRIMARY : A
NOT     : 

