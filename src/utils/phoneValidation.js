const PROVIDER_PREFIXES = {
  telkomsel: [
    "0811",
    "0812",
    "0813",
    "0821",
    "0822",
    "0823",
    "0851",
    "0852",
    "0853",
  ],
  indosat: ["0814", "0815", "0816", "0855", "0856", "0857", "0858"],
  xl: ["0817", "0818", "0819", "0859", "0877", "0878"],
  axis: ["0831", "0832", "0833", "0838"],
  tri: ["0895", "0896", "0897", "0898", "0899"],
  smartfren: [
    "0881",
    "0882",
    "0883",
    "0884",
    "0885",
    "0886",
    "0887",
    "0888",
    "0889",
  ],
};

/**
 * Membersihkan dan memformat nomor telepon.
 * Mengubah "08..." menjadi "628..." dan menghapus karakter non-digit.
 * @param {string} phone - Nomor telepon input.
 * @returns {string} Nomor telepon yang sudah bersih.
 */
const cleanPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, ""); // Hapus semua selain digit
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  }
  return cleaned;
};

/**
 * Mendapatkan nama provider dari nomor telepon.
 * @param {string} phone - Nomor telepon input.
 * @returns {string|null} Nama provider atau null jika tidak ditemukan.
 */
const getProviderFromNumber = (phone) => {
  const cleaned = cleanPhoneNumber(phone);
  const prefix = cleaned.substring(0, 4); // Ambil 4 digit pertama (misal: 6281)

  for (const provider in PROVIDER_PREFIXES) {
    // Ubah prefix 08xx menjadi 628xx untuk perbandingan
    const providerPrefixesWithCountryCode = PROVIDER_PREFIXES[provider].map(
      (p) => "62" + p.substring(1)
    );
    if (providerPrefixesWithCountryCode.some((p) => cleaned.startsWith(p))) {
      return provider;
    }
  }

  return null;
};

module.exports = {
  cleanPhoneNumber,
  getProviderFromNumber,
};
