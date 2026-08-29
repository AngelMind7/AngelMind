<div align="center">

<img src="assets/readme/angelmind-banner.gif" alt="AngelMind colorful animated banner" width="100%" />

# AngelMind

### Find deeper. Prove clearly. Report responsibly.

**Bug bounty and authorized offensive security research, organized for real-world impact.**

</div>

---

## What is AngelMind?

AngelMind adalah platform untuk **bug bounty, vulnerability discovery, dan authorized offensive security research**. AngelMind membantu security researcher, bug hunter, program owner, dan security team mengelola seluruh perjalanan sebuah vulnerability: memahami scope, menemukan weakness, mengumpulkan bukti, memvalidasi dampak, membuat report, melakukan retest, dan berkomunikasi sampai issue terselesaikan.

AngelMind bukan produk defensive monitoring, SIEM, SOC dashboard, atau endpoint protection. Fokus kami adalah sisi **offensive security yang sah**: membantu researcher menemukan dan membuktikan kelemahan sebelum kelemahan tersebut disalahgunakan.

> **AngelMind turns offensive security research into clear, reproducible, and responsible vulnerability reports.**

---

## The mission

Misi AngelMind adalah membuat bug bounty dan offensive security research menjadi lebih mudah diikuti, lebih adil bagi researcher, dan lebih berguna bagi organisasi.

Banyak security finding kehilangan nilainya bukan karena vulnerability-nya tidak nyata, melainkan karena scope tidak jelas, evidence tidak lengkap, impact sulit dipahami, duplicate tidak terdeteksi, atau komunikasi antara researcher dan program owner tidak terstruktur. AngelMind dibangun untuk memperbaiki bagian tersebut.

Kami ingin setiap vulnerability report dapat menjawab dengan jelas:

- apa yang ditemukan;
- di mana dan dalam scope apa issue tersebut terjadi;
- bagaimana issue dapat direproduksi secara aman;
- apa dampak security yang masuk akal;
- evidence apa yang mendukung klaim tersebut;
- apa yang perlu diperbaiki; dan
- bagaimana perbaikannya diverifikasi melalui retest.

---

## For bug hunters

AngelMind membantu bug hunter bekerja dengan konteks yang lebih baik dan mengurangi waktu yang hilang karena proses yang tidak jelas.

Researcher dapat mengorganisasi program scope, asset, observation, hypothesis, task, evidence, finding, duplicate candidate, report draft, dan retest history. Dengan struktur tersebut, researcher dapat fokus pada kualitas research dan kejelasan laporan, bukan mengulang informasi yang sama atau menebak-nebak ekspektasi program.

### Researcher experience yang kami prioritaskan

| Kebutuhan researcher | Dukungan AngelMind |
|---|---|
| Memahami batas program | Scope, allowlist, exclusion, safe harbor, dan rules of engagement yang lebih eksplisit. |
| Menjaga alur research | Catatan dari observation hingga validated finding tetap memiliki konteks. |
| Membuktikan vulnerability | Evidence, reproducibility, impact, confidence, dan timeline dapat ditata bersama. |
| Menghindari duplicate | Finding fingerprint dan duplicate candidate membantu triage yang lebih konsisten. |
| Menulis report lebih baik | Report draft, review context, dan version history membantu memperjelas laporan. |
| Mengikuti perbaikan | Retest dan perubahan status menjaga lifecycle tetap terlihat. |
| Berkomunikasi dengan aman | Comment, mention, review, dan notification mendukung kolaborasi yang terarah. |

---

## For bug bounty programs

Program owner membutuhkan lebih dari sekadar inbox berisi laporan. Mereka membutuhkan cara untuk menerbitkan ekspektasi yang jelas, menilai kualitas finding secara konsisten, mengurangi duplicate, dan memberikan feedback yang dapat dipahami researcher.

AngelMind membantu program owner mengelola:

- program policy dan rules of engagement;
- in-scope assets dan exclusions;
- safe harbor serta batas pengujian;
- report intake dan triage;
- severity, impact, confidence, dan evidence review;
- duplicate handling;
- researcher communication;
- remediation status dan retest;
- audit trail serta perubahan keputusan.

AngelMind tidak menentukan reward secara otomatis atau menggantikan kebijakan program. Setiap program tetap memiliki kewenangan untuk menetapkan severity model, reward policy, disclosure timeline, dan keputusan akhir.

---

## For security teams

Untuk security team, AngelMind menyediakan workspace untuk mengubah raw research menjadi informasi yang dapat ditindaklanjuti. Observation, hypothesis, evidence, finding, report, review, dan retest dapat dipisahkan dengan jelas sehingga tim engineering maupun product menerima konteks yang mereka perlukan tanpa harus membaca ulang seluruh catatan research.

Tujuannya bukan membuat research terlihat lebih rumit. Tujuannya adalah membuat **vulnerability yang nyata menjadi lebih mudah dipercaya, diprioritaskan, diperbaiki, dan diverifikasi**.

---

## The AngelMind workflow

```text
Program scope
     ↓
Asset discovery and research notes
     ↓
Observation and hypothesis
     ↓
Safe validation and evidence
     ↓
Finding triage and duplicate review
     ↓
Report and human review
     ↓
Remediation tracking and retest
     ↓
Resolution and responsible disclosure
```

Setiap tahap memiliki konteks dan statusnya sendiri. Dengan begitu, laporan tidak langsung melompat dari dugaan menjadi klaim final tanpa evidence dan review yang memadai.

---

## What makes a strong finding?

AngelMind mendorong finding yang faktual, reproducible, dan proporsional. Finding yang kuat biasanya memiliki:

1. **Clear scope** — target atau asset yang diuji memang berada dalam authorization.
2. **Reproducible steps** — langkah validasi cukup jelas untuk ditinjau tanpa memperbesar dampak.
3. **Relevant evidence** — bukti mendukung klaim dan tidak menyertakan data sensitif yang tidak diperlukan.
4. **Accurate impact** — dampak dijelaskan berdasarkan hal yang benar-benar dapat dibuktikan.
5. **Useful remediation direction** — organisasi mendapat arah perbaikan yang masuk akal.
6. **Responsible handling** — researcher menghentikan aktivitas ketika evidence sudah memadai dan mengikuti disclosure policy.

Kami tidak mendorong overclaiming, sensational severity, data hoarding, atau pengujian yang melampaui kebutuhan validasi.

---

## Offensive by purpose, responsible by design

AngelMind memang dibuat untuk offensive security research. Researcher perlu mencari weakness, menguji asumsi keamanan, memvalidasi attack path yang diizinkan, dan menunjukkan dampak yang relevan. Namun offensive tidak berarti tanpa batas.

Semua research harus dilakukan hanya pada asset yang memiliki authorization dan sesuai rules of engagement. AngelMind menempatkan scope, exclusions, safe harbor, evidence boundaries, approval, dan human review sebagai bagian dari workflow agar aktivitas menemukan vulnerability tidak berubah menjadi akses yang tidak sah atau tindakan yang merugikan.

### Hal yang tidak boleh dilakukan

AngelMind tidak boleh digunakan untuk unauthorized access, credential abuse, destructive testing, data exfiltration, denial of service, persistence, evasion, harassment, atau pengujian terhadap target di luar scope. Keberadaan platform tidak pernah menjadi pengganti izin dari pemilik sistem.

---

## Responsible disclosure

Jika Anda menemukan vulnerability pada layanan atau deployment AngelMind, gunakan security contact resmi yang dipublikasikan oleh deployment terkait. Jangan mempublikasikan detail exploit, credential, token, data pribadi, atau informasi internal melalui public issue, pull request, screenshot, atau channel umum.

Berikan informasi secukupnya agar issue dapat divalidasi secara aman. Minimalkan dampak, jangan mengakses data pengguna yang tidak diperlukan, dan hentikan pengujian ketika bukti yang memadai telah diperoleh.

Untuk program atau target lain, selalu ikuti disclosure policy, scope, safe harbor, dan contact channel resmi yang ditetapkan oleh pemilik sistem.

---

## Our principles

| Prinsip | Arti bagi AngelMind |
|---|---|
| **Researcher first** | Researcher berhak mendapatkan scope, policy, dan feedback yang jelas. |
| **Evidence over hype** | Finding dinilai dari bukti dan dampak yang dapat dipertanggungjawabkan. |
| **Offensive with authorization** | Penemuan vulnerability hanya dilakukan pada target dan batas yang disetujui. |
| **Fair triage** | Duplicate, severity, impact, dan status perlu dinilai secara konsisten. |
| **Privacy by restraint** | Data yang tidak diperlukan tidak dikumpulkan, disimpan, atau dibagikan. |
| **Human judgment** | Automation membantu proses; keputusan penting tetap membutuhkan review manusia. |
| **Transparent communication** | Researcher dan program owner perlu berbagi konteks secara profesional. |
| **No invented claims** | Kami tidak mengklaim program, reward, partnership, atau capability yang belum resmi aktif. |

---

## Who should use AngelMind?

AngelMind cocok untuk:

- bug bounty hunter dan independent security researcher;
- internal offensive security team;
- application security dan product security team;
- bug bounty program manager;
- vulnerability triage dan remediation team;
- organisasi yang ingin membangun vulnerability disclosure program;
- security consultant yang bekerja dengan authorization tertulis.

AngelMind tidak ditujukan untuk aktivitas ilegal, anonymous abuse, atau operasi yang sengaja menghindari kontrol dan accountability.

---

## Collaboration

Kami terbuka terhadap kolaborasi dengan bug hunter, program owner, security researcher, application security team, product security team, dan organisasi yang ingin meningkatkan kualitas vulnerability management mereka.

Topik kolaborasi yang relevan meliputi bug bounty program design, researcher experience, vulnerability triage, evidence quality, responsible disclosure, retest workflow, dan human-in-the-loop offensive security operations.

Gunakan contact channel resmi AngelMind atau deployment terkait untuk memulai percakapan. Jangan mengirim credential, private key, token, data pribadi, atau informasi rahasia melalui channel publik.

---

## Public status

AngelMind dikembangkan secara bertahap dengan fokus pada pengalaman bug hunter, kualitas report, scope clarity, evidence integrity, privacy, dan responsible disclosure. Detail program, reward, target, availability, dan contact channel hanya berlaku jika dipublikasikan secara resmi oleh operator terkait.

README ini adalah pengenalan publik terhadap AngelMind. Ia tidak memberikan authorization untuk menguji sistem apa pun dan tidak menggantikan policy program, kontrak, safe harbor, atau approval dari pemilik target.

---

## Summary

> **AngelMind is for the people who look for what others miss—and take responsibility for what they find.**

Kami membangun tempat di mana bug hunter dapat melakukan research dengan lebih jelas, program owner dapat melakukan triage dengan lebih adil, dan vulnerability report dapat menghasilkan perbaikan nyata.

<div align="center">

**Find deeper. Prove clearly. Report responsibly.**

</div>
