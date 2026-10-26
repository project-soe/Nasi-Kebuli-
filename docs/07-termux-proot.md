# 07 - Bekerja di Termux (proot)

Di dalam proot-distro (Ubuntu/Debian), pakai **apt**, bukan `pkg`.

## Alat yang dibutuhkan (sekali)
    apt update
    apt install -y git python3 imagemagick unzip zip

## Git (sekali)
    git config --global user.name "Nama kamu"
    git config --global user.email "emailmu@contoh.com"
Saat `git push`, password diisi **Personal Access Token** GitHub (izin `repo`), bukan password akun.

## Mengakses file di penyimpanan HP
Di Termux biasa (di luar proot), jalankan sekali: `termux-setup-storage`.
Lalu masuk proot dengan folder penyimpanan ikut terpasang, contoh:
    proot-distro login ubuntu --bind /sdcard:/sdcard
Setelah itu file di folder Download terbaca di `/sdcard/Download/`.

## Menjalankan situs
    cd nasi-kebuli
    python3 dev-server.py
Buka http://localhost:8080 di Chrome HP.

## Memperkecil foto menu (4:3, 800x600)
    convert foto.jpg -resize 800x600^ -gravity center -extent 800x600 -quality 80 kebuli-baru.jpg
