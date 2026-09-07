/**
 * Chat Text Typo Normalizer
 *
 * Normalizes common typos, phonetic spelling errors, and shorthand in user messages
 * so that deterministic on-demand intent matching and search term extraction
 * succeed across all tenant portals (Vendor, Admin, Customer).
 */

export function normalizeVendorChatText(rawText: string): string {
  if (!rawText) return "";
  let text = rawText;

  // Greetings & Conversational
  text = text.replace(/\b(hy|hii+|heyy+|heya)\b/gi, "hi");

  // Customers & Guests
  text = text.replace(
    /\b(custoemrs?|coustomers?|costomers?|custmers?|costumers?|castomers?|cusotmer|cusotmers)\b/gi,
    (m) => (m.toLowerCase().endsWith("s") ? "customers" : "customer")
  );

  // Transactions & Payments
  text = text.replace(
    /\b(transistions?|transations?|transacations?|tranactions?|transictions?|transiction|trasactions?|transctions?|transactins?)\b/gi,
    (m) => (m.toLowerCase().endsWith("s") ? "transactions" : "transaction")
  );

  // Bookings & Reservations
  text = text.replace(
    /\b(bookoings?|bokings?|bookngs?|boookings?|boking|bokkngs?|bookin)\b/gi,
    (m) => (m.toLowerCase().endsWith("s") ? "bookings" : "booking")
  );

  // Earnings & Revenue
  text = text.replace(/\b(earcn|erann?)\b/gi, "earn");
  text = text.replace(
    /\b(earcns|erning|eranings?|erand|ernd|incom)\b/gi,
    "earnings"
  );
  text = text.replace(
    /\b(revnue|revinue|revenu|revanue|revenew)\b/gi,
    "revenue"
  );

  // Verbs & Action words
  text = text.replace(/\b(hcekc|chek|chekc|chck|chcek)\b/gi, "check");
  text = text.replace(/\b(gie|gve)\b/gi, "give");
  text = text.replace(/\b(detials|detailes|detils|deatails|detais)\b/gi, "details");
  text = text.replace(/\bhow\s+(mich|mch|muh)\b/gi, "how much");
  text = text.replace(/\b(curently|currntly|currenly|currentaly)\b/gi, "currently");
  text = text.replace(/\b(vneue|veneu|venew|veune)\b/gi, "venue");
  text = text.replace(/\b(locatoin|locaton|locashions?|locaiton)\b/gi, "location");
  text = text.replace(
    /\b(disscounts?|discouts?|dicounts?|dicsounts?|discunts?|discnts?)\b/gi,
    (m) => (m.toLowerCase().endsWith("s") ? "discounts" : "discount")
  );
  text = text.replace(/\b(copon|cupon|copons|cupons|copun)\b/gi, "coupon");
  text = text.replace(/\b(recieved|recived|receved)\b/gi, "received");
  text = text.replace(/\b(pendding|panding|peding)\b/gi, "pending");
  text = text.replace(/\b(christams|chirstmas|chrsitmas)\b/gi, "christmas");

  // Contact & Attributes
  text = text.replace(
    /\b(contanct|cantact|cntact|contat|contect|contct)\b/gi,
    "contact"
  );
  text = text.replace(/\b(numbr|nuber|nmbr|numb)\b/gi, "number");
  text = text.replace(/\b(inactve|inactiv|inacive)\b/gi, "inactive");
  text = text.replace(/\b(acitve|actve|ativ|actv)\b/gi, "active");

  // Temporal words
  text = text.replace(/\b(tody|todday|todaay|tday)\b/gi, "today");
  text = text.replace(/\b(yestarday|yesterdy|yesturday)\b/gi, "yesterday");
  text = text.replace(/\b(tommorow|tomorow|tomrw)\b/gi, "tomorrow");

  // Merged Words & Spacing Typos
  text = text.replace(/\b(activecurrently|activecurrenly|activecurrentaly)\b/gi, "active currently");
  text = text.replace(/\b(howmuch|howmich|howmch)\b/gi, "how much");
  text = text.replace(/\b(howmany|howmny)\b/gi, "how many");
  text = text.replace(/\b(showme|shome)\b/gi, "show me");
  text = text.replace(/\b(giveme|gimme)\b/gi, "give me");
  text = text.replace(/\b(tellme)\b/gi, "tell me");
  text = text.replace(/\b(allcustomers|allcustomer)\b/gi, "all customers");
  text = text.replace(/\b(allbookings|allbooking)\b/gi, "all bookings");
  text = text.replace(/\b(allrooms|allroom)\b/gi, "all rooms");
  text = text.replace(/\b(alldiscounts|alldiscount)\b/gi, "all discounts");
  text = text.replace(/\b(allcoupons|allcoupon)\b/gi, "all coupons");

  return text;
}
