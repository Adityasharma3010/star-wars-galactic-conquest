import {test,expect} from '@playwright/test';
import {createGame,transition} from '../../src/game/engine/game.js';
import {getCard} from '../../src/game/cards/decks.js';
const players=[{id:'you',name:'Rebel Commander',character:'luke',faction:'Rebel Alliance',color:'#79b0dc',ai:false},{id:'rival',name:'Imperial Commander',character:'vader',faction:'Galactic Empire',color:'#d76969',ai:false}];
async function load(page,game,eventQueue=[]) {
  await page.addInitScript(state=>localStorage.setItem('galactic-conquest-v1',JSON.stringify({state,version:1})),{game,eventQueue,online:false,matchAway:false,selected:1,profile:{name:'Rebel Commander',character:'luke',faction:'Rebel Alliance'},settings:{mute:true,reducedMotion:true}});
  await page.goto('/');await expect(page.getByTestId('game-board')).toBeVisible();
}
for(const [deck,id] of [['force','f1'],['galactic','g1']])test(deck+' events have a cinematic scene, readable briefing and one applied effect',async({page})=>{
  const game=createGame(players);game.players[0].position=deck==='force'?4:39;game.decks[deck]=[id];let n=0;const next=transition(game,{id:'event-qa',type:'ROLL',player:'you',version:0,payload:{},now:Date.now()},()=>[.01,.18][n++%2]);
  await load(page,next,[{id:'cinematic-qa',card:getCard(id),player:next.players[0],readyAt:0}]);
  await expect(page.getByRole('heading',{name:getCard(id).title,exact:true})).toBeVisible();await expect(page.locator('.event-scene')).toBeVisible();await expect(page.locator('.event-toast')).toHaveCount(0);await expect(page.locator('.event-briefing')).toContainText(getCard(id).description);
  await page.screenshot({path:'test-results/'+deck+'-event-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/'+deck+'-event-mobile.png',fullPage:true});
  const credits=next.players[0].credits;await page.getByRole('button',{name:'Continue mission'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.commander-card').first()).toContainText(credits.toLocaleString());await expect(page.getByRole('timer',{name:'Turn countdown'})).toHaveCount(0);
});
test('holographic trades show world manifests and preserve negotiation actions',async({page})=>{
  const game=createGame(players);game.phase='end';game.ownership[1]={owner:'you',level:0,mortgaged:false};game.ownership[3]={owner:'rival',level:0,mortgaged:false};await load(page,game);
  await expect(page.locator('.owner-chip,.commander-number')).toHaveCount(0);await expect(page.locator('.owner-sigil')).toHaveCount(2);await page.getByRole('button',{name:'Propose a trade'}).click();await expect(page.locator('.trade-banner')).toContainText('OUTER RIM EXCHANGE');await expect(page.locator('.trade-world-image')).toHaveCount(2);
  await page.getByRole('checkbox',{name:/Tatooine/}).check();await page.getByRole('checkbox',{name:/Jakku/}).check();await page.getByLabel('CREDITS INCLUDED').first().fill('40');await page.screenshot({path:'test-results/trade-manifests-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Send trade offer'}).click();await expect(page.locator('.trade-offer')).toContainText('PENDING');await page.getByRole('button',{name:'Accept',exact:true}).click();await expect(page.locator('.trade-offer')).toContainText('ACCEPTED');await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/trade-manifests-mobile.png',fullPage:true});
});
