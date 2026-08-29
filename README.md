<div align="center">

<img src="assets/readme/angelmind-banner.gif" alt="AngelMind abstract blue and violet guardian banner" width="100%" />

# AngelMind

### Building safer security research through clarity, accountability, and human review.

**Governed security research operations for teams that take trust seriously.**

</div>

---

## Tentang AngelMind

AngelMind adalah inisiatif yang berfokus pada **security research yang bertanggung jawab, terotorisasi, dan dapat dipertanggungjawabkan**. Kami membantu tim, organisasi, dan researcher menjaga agar setiap pekerjaan security research dimulai dari scope yang jelas, berlangsung dengan batas yang aman, dan berakhir dengan evidence serta keputusan yang dapat ditinjau.

Kami percaya bahwa security research yang baik bukan hanya tentang menemukan masalah. Security research juga membutuhkan konteks, komunikasi, reproducibility, penghormatan terhadap privasi, serta tanggung jawab terhadap sistem dan pengguna yang terdampak.

> **Clarity before action. Evidence before conclusion. Human accountability at every important boundary.**

---

## Misi kami

Misi AngelMind adalah membantu ekosistem security research menjadi lebih aman, lebih transparan, dan lebih mudah dipertanggungjawabkan.

Kami ingin mendorong budaya di mana:

- authorization dan scope selalu dipahami sebelum research dimulai;
- researcher dapat bekerja dengan ekspektasi dan batas yang jelas;
- evidence dicatat secara rapi tanpa mengumpulkan data sensitif yang tidak diperlukan;
- finding dinilai berdasarkan kualitas dan dampak, bukan hanya jumlah laporan;
- organisasi dapat meninjau keputusan, perubahan, dan responsibility secara transparan;
- tindakan penting tetap membutuhkan human review dan approval yang sesuai.

---

## Apa yang kami bangun

AngelMind membangun pengalaman dan proses untuk mendukung lifecycle security research yang bertanggung jawab, mulai dari persiapan hingga review hasil.

| Fokus | Nilai yang kami utamakan |
|---|---|
| **Program clarity** | Scope, aturan, safe harbor, exclusions, dan ekspektasi pelaporan harus mudah dipahami. |
| **Research organization** | Catatan research, asset, observation, hypothesis, dan task perlu memiliki konteks yang jelas. |
| **Evidence quality** | Evidence harus relevan, reproducible, terbatas pada kebutuhan, dan dapat ditinjau. |
| **Finding lifecycle** | Finding perlu melewati proses triage, validasi, deduplication, retest, dan review. |
| **Responsible reporting** | Report harus jelas, berdampak, dapat diverifikasi, dan tidak melebih-lebihkan klaim. |
| **Governance** | Keputusan penting harus memiliki owner, reviewer, alasan, dan jejak yang dapat ditelusuri. |
| **Team collaboration** | Researcher, reviewer, operator, dan stakeholder perlu berbagi konteks tanpa mengorbankan privacy. |

---

## Untuk siapa AngelMind

AngelMind ditujukan bagi organisasi dan komunitas yang ingin membangun proses security research dengan standar tanggung jawab yang tinggi.

### Untuk program owner dan organisasi

AngelMind membantu program owner menjelaskan rules of engagement, menjaga scope tetap eksplisit, mengelola review, dan memahami status pekerjaan tanpa kehilangan accountability.

### Untuk security researcher

AngelMind dirancang agar researcher dapat bekerja dengan konteks yang lebih jelas: apa yang in scope, apa yang excluded, evidence seperti apa yang dibutuhkan, dan bagaimana finding akan ditinjau.

### Untuk reviewer dan security team

AngelMind membantu reviewer memeriksa kualitas evidence, menilai dampak, membandingkan finding, mendokumentasikan keputusan, dan menjaga agar laporan tidak bergerak terlalu cepat tanpa validasi manusia.

### Untuk engineering dan product team

AngelMind membantu menghubungkan security finding dengan komunikasi yang jelas, remediation context, retest, dan riwayat keputusan yang dapat dipahami oleh stakeholder non-security.

---

## Prinsip kami

### 1. Authorized research only

Semua aktivitas security research harus berada dalam authorization dan scope yang sah. Keberadaan sebuah program atau tool tidak pernah dapat dianggap sebagai izin untuk mengakses, menguji, atau memengaruhi sistem di luar batas yang ditentukan.

### 2. Safety is a product requirement

Safety bukan tambahan setelah fitur selesai. Scope, exclusions, privacy, evidence handling, review, dan escalation adalah bagian dari cara produk harus digunakan sejak awal.

### 3. Human review matters

Automation dapat membantu mengorganisasi informasi, tetapi keputusan yang memiliki konsekuensi penting harus tetap dapat ditinjau dan dipertanggungjawabkan oleh manusia.

### 4. Evidence over speculation

Klaim security sebaiknya didukung evidence yang cukup, relevan, dan dapat diverifikasi. Kami mengutamakan kualitas, reproducibility, dan konteks daripada sensasionalisme.

### 5. Privacy by restraint

Kumpulkan, simpan, dan bagikan hanya informasi yang memang diperlukan. Data pribadi, credential, secret, dan informasi internal bukan bahan untuk dipublikasikan di repository, issue, report, atau channel umum.

### 6. Respect for researchers and operators

Researcher membutuhkan kejelasan dan fair treatment. Operator membutuhkan konteks yang dapat ditindaklanjuti. Kedua pihak berhak mendapatkan komunikasi yang profesional dan proses yang konsisten.

### 7. Honest communication

Kami tidak mengklaim certification, customer adoption, uptime, active capability, atau partnership yang belum diverifikasi secara resmi. Status yang belum aktif akan dijelaskan sebagai belum aktif.

---

## Cara kami memandang security finding

Finding yang baik bukan sekadar output teknis. Finding yang berguna biasanya menjawab beberapa pertanyaan penting:

1. **Apa yang terjadi?** Jelaskan perilaku atau kondisi yang diamati secara faktual.
2. **Mengapa hal itu penting?** Hubungkan dengan security impact dan pihak yang berisiko.
3. **Apa batas evidence-nya?** Bedakan fakta, asumsi, dan hal yang belum terverifikasi.
4. **Bagaimana organisasi dapat memvalidasinya?** Berikan langkah yang aman dan sesuai authorization.
5. **Apa yang dapat diperbaiki?** Sampaikan remediation direction tanpa klaim yang tidak perlu.
6. **Apa yang harus dihindari?** Jangan menyertakan data sensitif, credential, atau bukti yang melampaui kebutuhan validasi.

Kami mendorong laporan yang jelas, tenang, reproducible, dan membantu organisasi memperbaiki masalah tanpa memperbesar risiko.

---

## Responsible disclosure

Jika Anda menemukan security issue pada layanan atau deployment AngelMind, gunakan **security contact resmi yang dipublikasikan oleh deployment terkait**. Jangan memasukkan detail sensitif ke public issue, pull request, komentar, screenshot publik, atau repository.

Saat melakukan disclosure:

- pastikan Anda memiliki authorization yang sesuai;
- hindari akses atau pengumpulan data pengguna;
- hentikan aktivitas ketika evidence yang cukup telah diperoleh;
- minimalkan dampak dan jangan melakukan destructive testing;
- simpan informasi sensitif hanya pada channel yang aman;
- berikan waktu dan konteks yang wajar untuk review serta remediation;
- ikuti kebijakan disclosure yang berlaku pada organisasi pemilik sistem.

Halaman ini tidak memberikan izin untuk menguji sistem apa pun. Untuk deployment tertentu, selalu ikuti kebijakan, scope, dan contact channel yang secara resmi ditetapkan oleh operatornya.

---

## Komitmen terhadap researcher

Kami menghargai researcher yang bekerja secara etis dan bertanggung jawab. Kami percaya bahwa researcher berhak mendapatkan:

- program rules yang dapat dipahami;
- scope dan exclusions yang tidak ambigu;
- jalur komunikasi yang wajar;
- proses review yang konsisten;
- feedback yang profesional;
- pengakuan terhadap kontribusi yang valid;
- perlindungan terhadap privacy dan data yang tidak relevan.

Kami juga percaya bahwa researcher memiliki tanggung jawab untuk menghormati scope, menjaga kerahasiaan, meminimalkan dampak, dan tidak menggunakan akses yang diperoleh untuk tujuan di luar authorization.

---

## Komitmen terhadap organisasi

Kami membantu organisasi membangun proses yang lebih dapat ditinjau tanpa mengubah security research menjadi aktivitas yang tidak terkendali. Fokus kami adalah membantu organisasi:

- membuat ekspektasi program lebih mudah dipahami;
- memisahkan evidence dari opini dan asumsi;
- meningkatkan kualitas triage serta report;
- menjaga decision trail yang dapat ditelusuri;
- mengurangi duplikasi dan miskomunikasi;
- mempertahankan human accountability;
- meningkatkan kesiapan remediation dan retest.

AngelMind bukan pengganti security team, legal counsel, incident response process, atau keputusan organisasi. AngelMind adalah pendukung proses agar keputusan tersebut dibuat dengan konteks yang lebih baik.

---

## Batas penggunaan

AngelMind **tidak boleh digunakan** untuk unauthorized access, credential abuse, destructive testing, data exfiltration, evasion of controls, harassment, atau aktivitas lain yang melanggar hukum maupun kebijakan pemilik sistem.

AngelMind juga bukan jaminan bahwa sebuah program, finding, atau keputusan otomatis benar. Pengguna tetap bertanggung jawab untuk memastikan authorization, scope, legal context, evidence quality, dan external action yang dilakukan.

> Tidak ada tool, platform, badge, atau repository yang menggantikan authorization tertulis dan penilaian manusia yang bertanggung jawab.

---

## Status publik

AngelMind berkembang secara bertahap dengan prioritas pada safety, evidence integrity, privacy, dan operational clarity. Kemampuan yang memerlukan provider, account, deployment, atau approval organisasi akan diaktifkan secara terpisah setelah prasyaratnya terpenuhi.

Kami memilih untuk tidak menampilkan klaim yang belum terverifikasi. Untuk informasi publik mengenai deployment tertentu, gunakan website, Trust Center, policy, atau contact channel resmi dari deployment tersebut.

---

## Berkolaborasi dengan kami

Kami terbuka terhadap percakapan dengan security researcher, program owner, security team, engineering team, privacy professional, dan organisasi yang ingin meningkatkan kualitas security research operations.

Topik kolaborasi yang relevan meliputi governance, responsible disclosure, evidence quality, researcher experience, privacy-respecting workflows, security program design, dan human-in-the-loop review.

Untuk memulai percakapan, gunakan contact channel resmi yang tersedia pada deployment atau organisasi AngelMind yang Anda gunakan. Jangan mengirim credential, private key, token, data pribadi, atau informasi rahasia melalui README, public issue, atau channel publik.

---

## Ringkasan

AngelMind dibangun untuk satu gagasan sederhana:

> **Security research yang lebih baik membutuhkan lebih dari sekadar kemampuan teknis. Ia membutuhkan kejelasan, batas, evidence, empati, dan tanggung jawab.**

Jika Anda membangun program security, meneliti sistem secara sah, meninjau finding, atau membantu organisasi mengambil keputusan yang lebih aman, AngelMind dibuat untuk mendukung proses tersebut.

<div align="center">

**Clarity. Evidence. Accountability.**

</div>
