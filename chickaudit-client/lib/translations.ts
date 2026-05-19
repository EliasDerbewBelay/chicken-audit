const amharicDict: Record<string, string> = {
  "Dashboard": "ዳሽቦርድ",
  "Daily log": "ዕለታዊ መዝገብ",
  "Sales": "ሽያጭ",
  "Expenses": "ወጪዎች",
  "Health": "ጤና",
  "Sign out": "ውጣ",
  "Save": "አስቀምጥ",
  "Cancel": "ሰርዝ",
  "Date": "ቀን",
  "Notes": "ማስታወሻ",
  "Eggs collected": "የተሰበሰቡ እንቁላሎች",
  "Feed given (kg)": "የተሰጠ መኖ",
  "Feed given": "የተሰጠ መኖ",
  "Deaths": "ሞቶች",
  "Record sale": "ሽያጭ መዝግብ",
  "Amount (ETB)": "መጠን",
  "Amount": "መጠን",
  "Buyer": "ገዢ",
  "Category": "ምድብ",
  "Supplier": "አቅራቢ",
  "Farm accounts": "የእርሻ መለያዎች",
  "Reset password": "የይለፍ ቃል ዳግም አስጀምር",
  "Active flock": "ንቁ መንጋ",
  "Revenue": "ገቢ",
  "Net": "ትርፍ",
  "Delete": "ሰርዝ",
  "Sign in": "ግባ",
  "Email": "ኢሜይል",
  "Password": "የይለፍ ቃል",
  "Type": "አይነት",
  "Quantity": "ብዛት",
  "Details": "ዝርዝር",
  "Event type": "የክስተት አይነት",
  "Good morning": "እንደምን አደሩ",
  "Submit now": "አሁን አስገባ",
  "Farm Overview": "የእርሻ አጠቃላይ እይታ",
  "This month": "በዚህ ወር",
  "Open daily log": "ዕለታዊ መዝገብ ክፈት",
  "New entry": "አዲስ ግቤት",
  "Record expense": "ወጪ መዝግብ",
  "Log health event": "የጤና ክስተት መዝግብ",
  "No entries yet": "እስካሁን ምንም ግቤቶች የሉም",
  "Your recent entries": "የቅርብ ጊዜ ግቤቶችዎ",
  "All farm entries": "ሁሉም የእርሻ ግቤቶች",
  "Deaths this month": "በዚህ ወር የሞቱ",
  "Recorded by": "የተመዘገበው በ",
  "This cannot be undone": "ይህ ሊቀለበስ አይችልም"
};

export type Language = "en" | "am";

export function t(key: string, lang: Language): string {
  if (lang === "am" && key in amharicDict) {
    return amharicDict[key] as string;
  }
  return key; // Fallback to the English string directly
}
