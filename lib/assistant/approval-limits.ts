// Onay kartlarının (sepet / fiş) istemciden sunucuya gönderdiği payload için
// boyut tavanları. Tek yerde: sunucu (api/assistant/chat) bunları zorlar;
// kartlar ve modelin ürettiği taslaklar aynı sınırlarda tutulur ki kullanıcı
// arayüzün izin verdiği bir listeyi onaylarken reddedilmesin.
//
// Neden tavan: bir onay turu tek kota slotu yer ama kalem başına marketfiyati
// araması ve eşleştirme modeline giden bir prompt bloğu üretir. Gerçek bir
// alışveriş listesi ya da uzun bir market fişi bu sınırların çok altında kalır.
export const MAX_APPROVAL_ITEMS = 100
export const MAX_ITEM_NAME = 200
export const MAX_SEARCH_QUERY = 100
