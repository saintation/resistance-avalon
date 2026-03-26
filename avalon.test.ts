import { test, expect, BrowserContext, Page } from '@playwright/test';

const TARGET_URL = 'https://saintation.github.io/resistance-avalon/';
const TOTAL_PLAYERS = Math.floor(Math.random() * 6) + 5; 

test.describe.serial('레지스탕스 아발론 자동화 봇 시뮬레이션 (5~10인 랜덤)', () => {
  let contexts: BrowserContext[] = [];
  let pages: Page[] = [];
  let roomCode = '';

  test.beforeAll(async ({ browser }) => {
    for (let i = 0; i < TOTAL_PLAYERS; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // 경고창(Alert, Confirm) 무조건 자동 수락 방어 코드
      page.on('dialog', async dialog => {
        try { await dialog.accept(); } catch(e) {}
      });
      
      contexts.push(context);
      pages.push(page);
    }
  });

  test.afterAll(async () => {
    for (const context of contexts) {
      await context.close();
    }
  });

  test('방 생성 및 전체 플레이어 입장', async () => {
    test.setTimeout(120000);
    const hostPage = pages[0];
    await hostPage.goto(TARGET_URL);
    await hostPage.fill('#nicknameInput', '방장');
    await hostPage.click('#createRoomBtn');
    await expect(hostPage.locator('#roomTitle')).toHaveText(/방 코드: \d{4}/);
    roomCode = (await hostPage.locator('#roomTitle').innerText()).replace('방 코드: ', '').trim();

    for (let i = 1; i < TOTAL_PLAYERS; i++) {
      const guestPage = pages[i];
      await guestPage.goto(TARGET_URL);
      await guestPage.fill('#nicknameInput', `플레이어${i}`);
      await guestPage.fill('#roomCodeInput', roomCode);
      await guestPage.click('#joinRoomBtn');
      await expect(guestPage.locator('#myNickname')).toHaveText(`플레이어${i}`);
    }
    await expect(hostPage.locator('#playerList .player-item')).toHaveCount(TOTAL_PLAYERS);
  });

  test('전체 게임 사이클 3회 무작위 시뮬레이션 반복 (상세 로그 및 롤 표기)', async () => {
    test.setTimeout(1200000); 

    for (let gameRound = 1; gameRound <= 3; gameRound++) {
      console.log(`\n=================================================`);
      console.log(`🎲 시뮬레이션 게임 ${gameRound}회차 시작 (총 인원: ${TOTAL_PLAYERS}명)`);
      console.log(`=================================================`);
      
      await Promise.all(pages.map(page => page.click('#readyBtn', { force: true })));
      await Promise.all(pages.map(page => expect(page.locator('#readyBtn')).toHaveText('준비 완료!', { timeout: 15000 })));

      const hostPage = pages[0];

      const evilMax = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 }[TOTAL_PLAYERS] - 1; 
      const goodMax = TOTAL_PLAYERS - { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 }[TOTAL_PLAYERS] - 1; 
      
      let currentEvil = 0; let currentGood = 0;
      if (Math.random() > 0.5 && currentGood < goodMax) { await hostPage.check('#cbPercival', { force: true }); currentGood++; }
      else { await hostPage.uncheck('#cbPercival', { force: true }); }
      if (Math.random() > 0.5 && currentEvil < evilMax) { await hostPage.check('#cbMorgana', { force: true }); currentEvil++; }
      else { await hostPage.uncheck('#cbMorgana', { force: true }); }
      if (Math.random() > 0.5 && currentEvil < evilMax) { await hostPage.check('#cbMordred', { force: true }); currentEvil++; }
      else { await hostPage.uncheck('#cbMordred', { force: true }); }
      if (Math.random() > 0.5 && currentEvil < evilMax) { await hostPage.check('#cbOberon', { force: true }); currentEvil++; }
      else { await hostPage.uncheck('#cbOberon', { force: true }); }

      await expect(hostPage.locator('#startGameBtn')).not.toBeDisabled();
      await hostPage.locator('#startGameBtn').click({ force: true });
      await expect(hostPage.locator('#playArea')).not.toHaveClass(/hidden/);

      // 닉네임별 직업 매핑 객체 (암살자 표적 필터링에 사용)
      let roleMap: Record<string, string> = {};

      console.log(`\n🎭 [직업 배정 결과]`);
      for (let i = 0; i < TOTAL_PLAYERS; i++) {
        const p = pages[i];
        const nickname = await p.locator('#myNickname').innerText();
        
        await p.click('#toggleRoleBtn', { force: true });
        await expect(p.locator('#myRoleDisplay')).not.toHaveText('로딩 중', { timeout: 10000 });
        
        const roleText = await p.locator('#myRoleDisplay').innerText();
        roleMap[nickname] = roleText; // 맵에 저장
        console.log(`   - ${nickname} : ${roleText}`);
        
        await p.click('#toggleRoleBtn', { force: true });
      }
      console.log(`-------------------------------------------------`);

      let isGameOver = false;

      while (!isGameOver) {
        await hostPage.waitForTimeout(500); 

        // [A] 게임 종료 판정
        if (await hostPage.locator('#gameOverArea').isVisible()) {
          isGameOver = true;
          const reason = await hostPage.locator('#gameOverReason').innerText();
          console.log(`\n🏆 [게임 ${gameRound}회차 최종 결과] ${reason}\n`);
          break;
        }
        
        // [B] 투표 결과 확인
        if (await hostPage.locator('#voteResultArea').isVisible()) {
          const voteMsg = await hostPage.locator('#voteResultMessage').innerText();
          const isApproved = voteMsg.includes('가결');
          console.log(`   👉 [팀 찬반 투표] ${isApproved ? '🟢 가결 (원정 출발)' : '🔴 부결 (다음 대장 교체)'}`);
          await hostPage.locator('#voteResultArea').waitFor({ state: 'hidden', timeout: 20000 }).catch(()=>{});
          continue;
        }

        // [C] 원정 결과 확인
        if (await hostPage.locator('#questResultArea').isVisible()) {
          const msg = await hostPage.locator('#questResultMessage').innerText();
          const summary = (await hostPage.locator('#questResultSummary').innerText()).replace(/\n/g, ' ');
          console.log(`   🚩 [원정 임무 완료] ${msg} (${summary})`);
          await hostPage.locator('#questResultArea').waitFor({ state: 'hidden', timeout: 20000 }).catch(()=>{});
          continue;
        }

        // [D] 팀 구성 단계 (원정대장 1명)
        let leaderPage = null;
        for (const p of pages) {
          if (await p.locator('#teamSelectionArea').isVisible()) {
            leaderPage = p;
            break;
          }
        }
        if (leaderPage) {
          const leaderName = await leaderPage.locator('#myNickname').innerText();
          const reqSize = parseInt(await leaderPage.locator('#requiredTeamSize').innerText(), 10);
          
          const submittedNames = await leaderPage.evaluate((size) => {
            const cbs = Array.from(document.querySelectorAll('.team-cb')) as HTMLInputElement[];
            const checkedCount = cbs.filter(cb => cb.checked).length;
            
            if (checkedCount === size) return null; 

            cbs.forEach(cb => cb.checked = false);
            const shuffled = cbs.sort(() => Math.random() - 0.5); 
            const names = [];
            for (let i = 0; i < size; i++) {
              shuffled[i].checked = true;
              shuffled[i].dispatchEvent(new Event('change', { bubbles: true })); 
              names.push(shuffled[i].parentElement?.textContent?.trim() || '알수없음');
            }
            
            const submitBtn = document.getElementById('submitTeamBtn') as HTMLButtonElement;
            submitBtn.disabled = false;
            submitBtn.click();
            
            return names;
          }, reqSize);

          if (submittedNames) {
            console.log(`\n👑 [원정대 구성] 대장 '${leaderName}'님이 ${reqSize}명의 팀을 제안했습니다: [${submittedNames.join(', ')}]`);
            await leaderPage.locator('#teamSelectionArea').waitFor({ state: 'hidden', timeout: 10000 }).catch(()=>{});
          }
          continue;
        }

        // [E] 팀 찬반 투표 단계 (전체)
        let needsTeamVote = false;
        for (const p of pages) {
          if (await p.locator('#teamVotingArea').isVisible() && await p.locator('#btnApprove').isEnabled()) {
            needsTeamVote = true; break;
          }
        }
        if (needsTeamVote) {
          console.log(`   🗳️ [투표 진행] 전체 플레이어가 원정대 승인 여부를 투표합니다.`);
          for (const p of pages) {
            if (await p.locator('#teamVotingArea').isVisible() && await p.locator('#btnApprove').isEnabled()) {
              // [변경] 찬성 확률 60% 적용
              if (Math.random() < 0.60) await p.locator('#btnApprove').click({ force: true });
              else await p.locator('#btnReject').click({ force: true });
            }
          }
          continue;
        }

        // [F] 원정 임무 수행 단계 (대원 개별)
        let needsQuestVote = false;
        for (const p of pages) {
          if (await p.locator('#questVotingArea').isVisible() && await p.locator('#btnQuestSuccess').isEnabled()) {
            needsQuestVote = true; break;
          }
        }
        if (needsQuestVote) {
          console.log(`   ⚔️ [임무 수행] 원정대원들이 임무 성공/실패 여부를 선택합니다...`);
          for (const p of pages) {
            if (await p.locator('#questVotingArea').isVisible() && await p.locator('#btnQuestSuccess').isEnabled()) {
              const canFail = await p.locator('#btnQuestFail').isVisible();
              if (canFail && Math.random() < 0.3) await p.locator('#btnQuestFail').click({ force: true });
              else await p.locator('#btnQuestSuccess').click({ force: true });
            }
          }
          continue;
        }

        // [G] 암살자 단계 (악 진영 배제 로직 적용)
        let assassinPage = null;
        for (const p of pages) {
          if (await p.locator('#assassinPhaseArea').isVisible() && await p.locator('#assassinActionUI').isVisible()) {
            if (!(await p.locator('#btnAssassinate').isDisabled())) {
              assassinPage = p; break;
            }
          }
        }
        if (assassinPage) {
          console.log(`   🗡️ [암살자 대기] 암살자가 선 진영(아서왕의 수하) 중 한 명을 멀린으로 추리하여 지목합니다...`);
          
          const targetIndex = await assassinPage.evaluate((map) => {
            const select = document.getElementById('assassinTargetSelect') as HTMLSelectElement;
            const validIndices = [];
            for (let i = 1; i < select.options.length; i++) {
              const nickname = select.options[i].text;
              const role = map[nickname] || "";
              if (role.includes('아서왕의 수하')) {
                validIndices.push(i);
              }
            }
            if (validIndices.length === 0) return 1; 
            return validIndices[Math.floor(Math.random() * validIndices.length)];
          }, roleMap);

          await assassinPage.locator('#assassinTargetSelect').selectOption({ index: targetIndex });
          await assassinPage.locator('#btnAssassinate').click({ force: true });
          continue;
        }
      } // End of while loop

      // [게임 재시작 초기화 대기]
      if (gameRound < 3) {
        console.log(`🔄 다음 회차를 위해 대기실로 복귀합니다...`);
        await hostPage.locator('#btnRestartGame').click({ force: true });
        
        await Promise.all(pages.map(page => 
          page.locator('#waitingArea').waitFor({ state: 'visible', timeout: 15000 })
        ));
        await Promise.all(pages.map(page => 
          expect(page.locator('#readyBtn')).toHaveText('준비하기', { timeout: 15000 })
        ));
      }
    }
  });
});
