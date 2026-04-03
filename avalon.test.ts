import { test, expect, BrowserContext, Page } from '@playwright/test';

const TARGET_URL = 'https://saintation.github.io/resistance-avalon/';
const TOTAL_PLAYERS = Math.floor(Math.random() * 6) + 5; 

test.describe.serial('레지스탕스 아발론 자동화 봇 시뮬레이션 (동적 예외 룰 반영)', () => {
  let contexts: BrowserContext[] = [];
  let pages: Page[] = [];
  let roomCode = '';

  test.beforeAll(async ({ browser }) => {
    for (let i = 0; i < TOTAL_PLAYERS; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[Browser Error - 봇${i}] ${msg.text()}`);
      });

      page.on('dialog', async dialog => {
        console.log(`[Alert/Confirm 감지 - 봇${i}] ${dialog.message()}`);
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

  test('1. 방 생성 및 전체 플레이어 입장', async () => {
    test.setTimeout(120000);
    const hostPage = pages[0];
    
    await hostPage.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await hostPage.fill('#nicknameInput', '방장');
    await hostPage.waitForTimeout(500); 
    
    await expect(async () => {
      await hostPage.click('#createRoomBtn', { force: true });
      await expect(hostPage.locator('#passwordModal')).not.toHaveClass(/hidden/, { timeout: 1500 });
    }).toPass({ intervals: [500, 1000], timeout: 15000 });
    
    await hostPage.fill('#adminPasswordInput', 'dkqkffhs4028@'); 
    await hostPage.click('#confirmPasswordBtn'); 

    await expect(hostPage.locator('#roomTitle')).toHaveText(/방 코드: \d{4}/, { timeout: 15000 });
    const titleText = await hostPage.locator('#roomTitle').innerText();
    roomCode = titleText.replace('방 코드:', '').trim();

    for (let i = 1; i < TOTAL_PLAYERS; i++) {
      const guestPage = pages[i];
      await guestPage.goto(TARGET_URL, { waitUntil: 'networkidle' });
      await guestPage.fill('#nicknameInput', `플레이어${i}`);
      await guestPage.fill('#roomCodeInput', roomCode);
      await guestPage.click('#joinRoomBtn');
      await expect(guestPage.locator('#waitingArea')).toBeVisible({ timeout: 15000 });
    }
    
    await expect(hostPage.locator('#playerList .player-item')).toHaveCount(TOTAL_PLAYERS, { timeout: 10000 });
  });

  test('2. 전체 게임 사이클 무작위 시뮬레이션 및 UI 검증', async () => {
    test.setTimeout(1800000); 

    for (let gameRound = 1; gameRound <= 3; gameRound++) {
      console.log(`\n=================================================`);
      console.log(`🎲 게임 ${gameRound}회차 시작 (총 인원: ${TOTAL_PLAYERS}명)`);
      console.log(`=================================================`);
      
      await Promise.all(pages.map(page => page.click('#readyBtn', { force: true })));
      await Promise.all(pages.map(page => expect(page.locator('#readyBtn')).toHaveClass(/is-ready/, { timeout: 15000 })));

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

      await expect(hostPage.locator('#startGameBtn')).not.toBeDisabled({ timeout: 15000 });
      
      await expect(async () => {
        if (await hostPage.locator('#waitingArea').isVisible()) {
          await hostPage.locator('#startGameBtn').click({ force: true });
        }
        await expect(hostPage.locator('#playArea')).toBeVisible({ timeout: 3000 });
      }).toPass({ intervals: [1000, 2000, 3000], timeout: 20000 });

      // 직업 텍스트 검증 데이터
      const expectedDescriptions: Record<string, string> = {
        "멀린": "모드레드를 제외한 악의 무리를 알 수 있습니다",
        "퍼시벌": "누가 멀린인지 알 수 있습니다",
        "아서왕의 충직한 신하": "대화와 투표를 통해 누가 악인지 추리하세요",
        "암살자": "마지막에 멀린을 암살할 수 있습니다",
        "모르가나": "멀린으로 위장하며",
        "모드레드": "멀린에게 정체를 들키지 않으며",
        "오베론": "다른 악을 모르고 악도 당신을 모릅니다",
        "모드레드의 수하": "오베론을 제외한 다른 악을 압니다"
      };

      let roleMap: Record<string, string> = {};
      console.log(`\n🎭 [직업 배정 결과 및 UI 렌더링 검증]`);
      
      for (let i = 0; i < TOTAL_PLAYERS; i++) {
        const p = pages[i];
        const nickname = i === 0 ? '방장' : `플레이어${i}`;
        
        await p.click('#toggleRoleBtn', { force: true });
        await expect(p.locator('#myRoleDisplay')).toBeVisible({ timeout: 10000 });
        
        const roleText = await p.locator('#myRoleDisplay').innerText();
        roleMap[nickname] = roleText; 
        
        const expectedSnippet = expectedDescriptions[roleText] || "";
        if (expectedSnippet) {
           await expect(p.locator('#roleDescription')).toContainText(expectedSnippet);
        }

        // [핵심 수정] 기밀 정보 UI 검증 로직 분기 처리
        const mustHaveSecretInfo = ["멀린", "퍼시벌"].includes(roleText);
        const mightHaveSecretInfo = ["암살자", "모르가나", "모드레드", "모드레드의 수하"].includes(roleText);

        if (mustHaveSecretInfo) {
           // 멀린, 퍼시벌은 무조건 1명 이상의 타겟 존재 (멀린은 최소 1명의 비-모드레드 악, 퍼시벌은 멀린)
           await expect(p.locator('#secretInfoArea')).not.toHaveClass(/hidden/);
           const secretItemCount = await p.locator('#secretInfoList li').count();
           expect(secretItemCount).toBeGreaterThan(0); 
        } else if (mightHaveSecretInfo) {
           // 악 진영은 동료가 오베론밖에 없으면 기밀 정보가 없을 수 있음
           const isVisible = await p.locator('#secretInfoArea').isVisible();
           if (isVisible) {
               const secretItemCount = await p.locator('#secretInfoList li').count();
               expect(secretItemCount).toBeGreaterThan(0);
           }
        } else {
           // 오베론 및 아서왕의 충직한 신하
           await expect(p.locator('#secretInfoArea')).toHaveClass(/hidden/);
        }

        console.log(`   - [검증 완료] ${nickname} : ${roleText}`);
        await p.click('#toggleRoleBtn', { force: true });
      }

      let isGameOver = false;

      while (!isGameOver) {
        await hostPage.waitForTimeout(500); 

        if (await hostPage.locator('#gameOverArea').isVisible()) {
          isGameOver = true;
          const reason = await hostPage.locator('#gameOverReason').innerText();
          console.log(`\n🏆 [게임 ${gameRound}회차 최종 결과] ${reason}\n`);
          break;
        }
        
        if (await hostPage.locator('#voteResultArea').isVisible()) {
          const voteMsg = await hostPage.locator('#voteResultMessage').innerText();
          console.log(`   👉 [팀 찬반 투표 완료] ${voteMsg.includes('가결') ? '🟢 가결' : '🔴 부결'}`);
          
          await expect(async () => {
            for (const p of pages) {
              const btn = p.locator('#btnConfirm_teamVoteConfirmArea');
              if (await btn.isVisible()) {
                await btn.click({ force: true }).catch(() => {});
              }
            }
            await expect(hostPage.locator('#voteResultArea')).toHaveClass(/hidden/, { timeout: 1500 });
          }).toPass({ intervals: [1000, 2000], timeout: 30000 });
          
          await hostPage.waitForTimeout(2500); 
          continue;
        }

        if (await hostPage.locator('#questResultArea').isVisible()) {
          const msg = await hostPage.locator('#questResultMessage').innerText();
          console.log(`   🚩 [원정 임무 완료] ${msg}`);
          
          await expect(async () => {
            for (const p of pages) {
              const btn = p.locator('#btnConfirm_questConfirmArea');
              if (await btn.isVisible()) {
                await btn.click({ force: true }).catch(() => {});
              }
            }
            await expect(hostPage.locator('#questResultArea')).toHaveClass(/hidden/, { timeout: 1500 });
          }).toPass({ intervals: [1000, 2000], timeout: 30000 });
          
          await hostPage.waitForTimeout(2500); 
          continue;
        }

        let leaderPage = null;
        for (const p of pages) {
          if (await p.locator('#teamSelectionArea').isVisible()) { leaderPage = p; break; }
        }
        if (leaderPage) {
          const leaderIndex = pages.indexOf(leaderPage);
          const leaderName = leaderIndex === 0 ? '방장' : `플레이어${leaderIndex}`;
          
          await expect(leaderPage.locator('#requiredTeamSize')).toBeVisible({ timeout: 5000 });
          const reqSize = parseInt(await leaderPage.locator('#requiredTeamSize').innerText(), 10);
          
          const checkboxes = leaderPage.locator('.team-cb');
          const cbCount = await checkboxes.count();
          
          for (let i = 0; i < cbCount; i++) {
            if (await checkboxes.nth(i).isChecked()) await checkboxes.nth(i).uncheck({ force: true });
          }
          
          let selectedNames = [];
          const indices = Array.from({ length: cbCount }, (_, i) => i).sort(() => Math.random() - 0.5);
          for (let i = 0; i < reqSize; i++) {
            const idx = indices[i];
            await checkboxes.nth(idx).check({ force: true });
            const textContent = await checkboxes.nth(idx).evaluate(node => node.parentElement?.textContent?.trim() || '알수없음');
            selectedNames.push(textContent);
          }
          
          await expect(leaderPage.locator('#submitTeamBtn')).not.toBeDisabled({ timeout: 5000 });
          await leaderPage.locator('#submitTeamBtn').click({ force: true });
          console.log(`\n👑 [원정대 구성] 대장 '${leaderName}'님이 제안함: [${selectedNames.join(', ')}]`);
          
          await leaderPage.locator('#teamSelectionArea').waitFor({ state: 'hidden', timeout: 15000 }).catch(()=>{});
          continue;
        }

        let needsTeamVote = false;
        for (const p of pages) {
          if (await p.locator('#teamVotingArea').isVisible() && await p.locator('#btnApprove').isEnabled()) { needsTeamVote = true; break; }
        }
        if (needsTeamVote) {
          console.log(`   🗳️ [원정대 찬반 투표 진행 중...]`);
          await expect(async () => {
            for (const p of pages) {
              const approveBtn = p.locator('#btnApprove');
              const rejectBtn = p.locator('#btnReject');
              if (await p.locator('#teamVotingArea').isVisible() && await approveBtn.isEnabled()) {
                if (Math.random() < 0.75) await approveBtn.click({ force: true }).catch(()=>{});
                else await rejectBtn.click({ force: true }).catch(()=>{});
              }
            }
            await expect(hostPage.locator('#teamVotingArea')).toHaveClass(/hidden/, { timeout: 1500 });
          }).toPass({ intervals: [1000, 2000], timeout: 30000 });
          
          await hostPage.waitForTimeout(1000);
          continue;
        }

        let needsQuestVote = false;
        for (const p of pages) {
          if (await p.locator('#questVotingArea').isVisible() && await p.locator('#btnQuestSuccess').isEnabled()) { needsQuestVote = true; break; }
        }
        if (needsQuestVote) {
          console.log(`   ⚔️ [임무 성공/실패 결정 중...]`);
          await expect(async () => {
            for (const p of pages) {
              const successBtn = p.locator('#btnQuestSuccess');
              const failBtn = p.locator('#btnQuestFail');
              if (await p.locator('#questVotingArea').isVisible() && await successBtn.isEnabled()) {
                const canFail = await failBtn.isVisible();
                if (canFail && Math.random() < 0.3) await failBtn.click({ force: true }).catch(()=>{});
                else await successBtn.click({ force: true }).catch(()=>{});
              }
            }
            await expect(hostPage.locator('#questVotingArea')).toHaveClass(/hidden/, { timeout: 1500 });
          }).toPass({ intervals: [1000, 2000], timeout: 30000 });
          
          await hostPage.waitForTimeout(1000);
          continue;
        }

        let assassinPage = null;
        for (const p of pages) {
          if (await p.locator('#assassinPhaseArea').isVisible() && await p.locator('#assassinActionUI').isVisible()) {
            if (!(await p.locator('#btnAssassinate').isDisabled())) { assassinPage = p; break; }
          }
        }
        if (assassinPage) {
          console.log(`   🗡️ [암살자 지목] 암살을 시도합니다...`);
          
          let targetIndex = 1;
          const optionsText = await assassinPage.locator('#assassinTargetSelect option').allInnerTexts();
          const validTargets = [];
          for (let i = 1; i < optionsText.length; i++) {
            const nick = optionsText[i].trim();
            if (roleMap[nick]?.includes('신하') || roleMap[nick]?.includes('퍼시벌')) validTargets.push(i);
          }
          if (validTargets.length > 0) targetIndex = validTargets[Math.floor(Math.random() * validTargets.length)];

          await assassinPage.locator('#assassinTargetSelect').selectOption({ index: targetIndex });
          await assassinPage.locator('#btnAssassinate').click({ force: true });
          await assassinPage.locator('#assassinPhaseArea').waitFor({ state: 'hidden', timeout: 15000 }).catch(()=>{});
          continue;
        }
      } 

      if (gameRound < 3) {
        console.log(`🔄 다음 회차를 위해 대기실로 복귀합니다...`);
        await expect(async () => {
           if (await hostPage.locator('#gameOverArea').isVisible()) {
              await hostPage.locator('#btnRestartGame').click({ force: true });
           }
           await expect(hostPage.locator('#waitingArea')).toBeVisible({ timeout: 3000 });
        }).toPass({ intervals: [1000, 2000], timeout: 15000 });
        
        await Promise.all(pages.map(page => expect(page.locator('#readyBtn')).toHaveText('준비하기', { timeout: 15000 })));
      }
    }
  });
});
