// firebase-config.js

// 1. 파이어베이스 초기화 모듈 로드
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 2. 내 프로젝트 고유 설정값 (이곳에만 값을 정확히 채워 넣으시면 됩니다)
const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: "",
    databaseURL: ""
};

// 3. 파이어베이스 실행 및 데이터베이스 객체 생성
const app = initializeApp(firebaseConfig);

// 4. 외부 파일(index.html 등)에서 이 db 객체를 가져다 쓸 수 있도록 내보내기(export)
export const db = getDatabase(app);
