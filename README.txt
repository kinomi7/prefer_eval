prefer_eval は、各コーデ画像を VAS（線上の印）で評価する静的サイトです。

評価項目
① 嗜好（好き嫌い）
② フィット感
③ 着用意欲（普段着として）
④ 着用意欲（純粋な着用意欲）
各項目は 0〜100 の VAS です。丸は最初から中央（50）に表示されますが、評価済みになるのは「次の画像 →」を押したときだけです。

ファイル構成
README.txt         この説明
index.html         トップページ（Women / Men の選択）
site.html          評価画面のひな型。文言やレイアウトを変えるときはここを編集し、build_static.py を実行する
app.js             評価の動作（VAS、保存、次へ、CSV書き出し）
style.css          見た目（色、余白、VASの丸など）
packages.json      women / men と画像フォルダの対応
build_static.py    women/ と men/ のサイトを生成するスクリプト
data/              元画像
  women_images/    Women用のコーデ画像
  men_images/      Men用のコーデ画像
women/             GitHub公開用のWomenサイト（別URL）
  index.html       site.html からコピーされた評価画面
  config.json      サイトIDなどの設定
  images.json      画像一覧
men/               GitHub公開用のMenサイト（別URL）
  index.html / config.json / images.json は women/ と同様
.gitignore         Gitに載せないファイルの指定
.nojekyll          GitHub Pages がファイルを無視しないようにする印

公開URL（GitHub Pages の例）
・https://ユーザー名.github.io/リポジトリ名/          選択画面
・https://ユーザー名.github.io/リポジトリ名/women/     women_images
・https://ユーザー名.github.io/リポジトリ名/men/       men_images

履歴
評価はブラウザの localStorage に保存されます。
同じURLを同じブラウザで開くと続きから再開できます。

ローカル確認
1. cd prefer_eval
2. python3 build_static.py
3. python3 -m http.server 8080
4. http://localhost:8080/ を開く

編集の目安
・画面の文言・項目 → site.html を編集し、python3 build_static.py
・動き（保存、CSV） → app.js
・色や余白 → style.css
・トップの選択画面 → index.html

画像を追加・差し替えた場合
data/women_images または data/men_images を更新し、
python3 build_static.py
を実行してください。

GitHub Pages
1. prefer_eval の内容をリポジトリへ push
2. Settings → Pages → Deploy from a branch → main / (root)
3. 発行された URL の /women/ と /men/ を共有する
