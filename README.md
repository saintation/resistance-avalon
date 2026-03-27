# 🗡️ 레지스탕스 아발론: 온라인 (The Resistance: Avalon Online)

오프라인 마피아 류 보드게임인 **레지스탕스 아발론(The Resistance: Avalon)** 을 브라우저 환경에서 5~10인의 플레이어가 실시간으로 즐길 수 있도록 구현한 웹 애플리케이션입니다. 별도의 서버 구축 없이 Firebase Realtime Database를 활용하여 플레이어 간의 상태 동기화와 게임 로직을 순수 클라이언트 환경에서 처리합니다.

---
## 🚩 실행 (Play)
[https://saintation.github.io/resistance-avalon/](https://saintation.github.io/resistance-avalon/)

---
## 🎲 최신 업데이트 내역 (v1.1.2)

### 🔐 보안: 관리자 전용 방 생성 시스템

본 프로젝트는 Firebase 무료 요금제(Spark)의 동시 접속자 수 및 대역폭 한도를 보호하기 위해, **'방 생성 권한'**과 **'게임 참여 권한'**을 분리하여 설계했습니다.

참여자는 번거로운 로그인이나 회원가입 없이 방 코드만으로 즉시 게임에 접속할 수 있지만, 무분별한 트래픽 낭비를 막기 위해 **새로운 방을 개설하는 것은 비밀번호를 아는 관리자만 가능**하도록 서버(Firebase Rules) 단에서 강력하게 통제합니다. 브라우저의 서드파티 쿠키 차단 이슈를 우회하기 위해 소셜 로그인을 배제하고, 커스텀 프롬프트 기반의 직관적인 비밀번호 검증 방식을 채택했습니다.

#### ⚙️ Firebase Realtime Database 보안 규칙(Rules) 설정 방법

이 시스템이 정상적으로 작동하려면 클라이언트 코드 적용 외에, Firebase 서버 측에 아래의 보안 규칙을 반드시 적용해야 합니다. 이 규칙은 악의적인 API 호출이나 비정상적인 방 생성을 원천 차단합니다.

1. [Firebase Console](https://console.firebase.google.com/)에 접속하여 해당 프로젝트로 이동합니다.
2. 좌측 메뉴에서 **[Build] -> [Realtime Database]**를 선택합니다.
3. 상단의 **[규칙 (Rules)]** 탭을 클릭합니다.
4. 기존 코드를 모두 지우고, 아래의 JSON 코드를 복사하여 붙여넣습니다.
5. 코드 내의 `'원하는비밀번호'` 부분을 본인이 사용할 실제 관리자 비밀번호(영문/숫자)로 변경한 후 **[게시 (Publish)]**를 클릭합니다.

```json
{
  "rules": {
    "rooms": {
      ".indexOn": ["createdAt"],
      ".read": "true",
      "$roomId": {
        ".write": "(!data.exists() && newData.child('adminKey').val() === '원하는비밀번호') || (data.exists() && newData.val() != null) || (data.exists() && newData.val() == null && data.child('createdAt').val() < (now - 86400000))"
      }
    }
  }
}
```

---

## 📌 주요 기능 (Key Features)

### 1. 실시간 멀티플레이 로비 및 방 관리
* **방 생성 및 입장:** 4자리 난수 코드를 통한 프라이빗 룸 생성 및 입장 기능.
* **접속 안정성 보완:** 브라우저 종료 또는 네트워크 단절 시 `localStorage`와 Firebase `onDisconnect`를 활용한 세션 자동 복원 및 오프라인 상태 감지 기능.
* **가비지 컬렉션 (데이터 정리):** 클라이언트 접속 시 24시간이 경과한 오래된 방 데이터를 자동으로 삭제하여 DB 용량 최적화.

### 2. 아발론 핵심 룰 완벽 구현
* **가변 인원 지원:** 5인부터 10인까지 인원수에 따른 라운드별 요구 원정대원 수 및 선/악 진영 비율 자동 계산.
* **특수 직업 옵션:** 방장 권한으로 퍼시벌, 모르가나, 모드레드, 오베론 등 확장 직업의 투입 여부 설정 가능.
* **자동화된 게임 페이즈 전환:** * 원정대장 자동 순환 및 시각화 (현재 대장 및 대기열 표시)
  * 팀 구성 ➡️ 찬반 투표 (익명 처리 후 동시 공개) ➡️ 원정 임무 수행 (선 진영은 '성공' 강제)
  * 4라운드(7인 이상) 시 실패 카드 2장 필요 룰 적용.
  * 원정대 투표 5연속 부결 시 악 진영 즉시 승리 처리.

### 3. 암살자 및 최종 결과 공개
* 선 진영이 원정 3회 성공 시, 악 진영의 역전 기회인 **'암살자 단계(Assassin Phase)'** 자동 진입.
* 선 진영 플레이어 목록 중 대상을 선택하여 최종 승패 판정.
* 게임 종료 시, 모든 플레이어의 실제 정체(직업) 공개 및 대기실 복귀(재시작) 기능 제공.

---

## 🛠️ 기술 스택 (Tech Stack)

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+ Modules)
* **Backend & DB:** Firebase Realtime Database (BaaS)
* **Deployment:** GitHub Pages (권장)

---

## 🚀 로컬 실행 방법 (How to Run Locally)

본 프로젝트는 별도의 Node.js 백엔드 서버를 요구하지 않으나, Firebase 연동을 위한 환경 설정 파일이 필요합니다.

1. **저장소 클론**
   ```bash
   git clone https://github.com/saintation/resistance-avalon.git
   cd 저장소이름

2. Firebase 프로젝트 설정
* Firebase Console에서 새 프로젝트를 생성합니다.
* Realtime Database를 활성화하고, 테스트를 위해 보안 규칙(Rules)을 true로 임시 개방하거나 적절한 읽기/쓰기 권한을 설정합니다.
* 웹 앱을 추가하고 제공받은 Firebase SDK 구성(Config) 객체를 확인합니다.

3. firebase-config.js 파일 생성
* 프로젝트 루트 디렉토리에 firebase-config.js 파일을 생성하고 아래 양식에 맞게 본인의 키 값을 입력합니다.
  ```java script
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
  import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

  const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
      databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT_ID.appspot.com",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
  };

  const app = initializeApp(firebaseConfig);
  export const db = getDatabase(app);

4. 로컬 서버 실행
* ES6 모듈(type="module")을 사용하므로 file:// 프로토콜 대신 로컬 웹 서버를 통해 실행해야 합니다. (VS Code의 Live Server 확장 프로그램 등을 사용하십시오.)

---

## 📜 라이선스 (License)
이 프로젝트는 오픈 소스로 제공되며 MIT License를 따릅니다. 단, 'The Resistance: Avalon'의 게임 규칙 및 원작의 상표권은 원작자(Indie Boards & Cards)에게 있습니다. 이 소프트웨어는 상업적 목적으로 사용될 수 없으며, 개인적인 친목 및 스터디 용도로만 활용되어야 합니다.

---

*✨ 이 프로젝트는 AI 파트너(Gemini)와 함께 **바이브코딩(Vibe Coding)**을 통해 기획, 디자인, 아키텍처 설계, 그리고 개발되었습니다.*
