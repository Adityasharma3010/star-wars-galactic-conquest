export const THEME = { title: 'GALACTIC CONQUEST', subtitle: 'STAR WARS', tagline: 'A galaxy. A thousand worlds. One ruler.', era: 'Age of Rebellion', disclaimer: 'An independent, non-commercial fan game. Not affiliated with Lucasfilm, Disney, or Hasbro.' };
export const GROUPS = [
  {id:'outer',name:'Outer Rim',color:'#a98865'}, {id:'frontier',name:'Frontier Worlds',color:'#73c0d1'},
  {id:'rebel',name:'Rebel Territories',color:'#ac7cd1'}, {id:'ancient',name:'Ancient Worlds',color:'#db9755'},
  {id:'trade',name:'Trade Worlds',color:'#da6467'}, {id:'strategic',name:'Strategic Worlds',color:'#d3bc62'},
  {id:'imperial',name:'Imperial Territories',color:'#6bb589'}, {id:'core',name:'Galactic Core',color:'#6393da'},
];
const descriptions = {
  Tatooine:'A desert world beneath twin suns, home to moisture farms and bustling spaceports.', Jakku:'A remote desert world with a secret Imperial research installation during the Galactic Civil War.',
  Geonosis:'A rocky, ringed world with towering hive spires and a history of droid manufacturing.', Kessel:'A hazardous mining world known for spice and coaxium.', Lothal:'Farmland and cities reshaped by Imperial factories and a growing rebellion.',
  Hoth:'An isolated ice world that sheltered the Rebel Alliance at Echo Base.', Dantooine:'A green Outer Rim world and former home of the first Rebel Alliance base.', 'Yavin 4':'A forested moon whose ancient temples housed the principal Rebel base.',
  Dagobah:'A misty swamp world, rich in life and strong with the Force.', 'Ahch-To':'An ocean world in the Unknown Regions, home to the first Jedi Temple.', Mandalore:'A world of domed cities, deserts, and a proud warrior tradition.',
  Bespin:'A gas giant with a habitable atmospheric band and floating gas-mining settlements.', Naboo:'Green hills, lakes, and river cities share a world with underwater Gungan settlements.', Kashyyyk:'The forested Wookiee homeworld, with cities built among enormous trees.',
  Kamino:'Storms and endless oceans surround stilt-mounted Kaminoan cities.', 'Mon Cala':'An ocean world of coral reefs, home to the Mon Calamari and Quarren.', Scarif:'A tropical world protected by planetary shields around a major Imperial installation.',
  Mustafar:'A small volcanic world with lava rivers and valuable mineral deposits.', Endor:'A remote forest moon and the home of the Ewoks.', Corellia:'An ancient Core world renowned for its industrial shipyards.',
  Alderaan:'A peaceful world remembered for its mountain valleys, culture, and natural beauty.', Coruscant:'A planet-spanning city and the political heart of the galaxy.',
};
const worlds = ['Tatooine','Jakku','Geonosis','Kessel','Lothal','Hoth','Dantooine','Yavin 4','Dagobah','Ahch-To','Mandalore','Bespin','Naboo','Kashyyyk','Kamino','Mon Cala','Scarif','Mustafar','Endor','Corellia','Alderaan','Coruscant'];
const slots = [1,3,6,8,9,11,13,14,16,18,19,21,23,24,26,27,29,31,32,34,37,39];
const prices = [60,60,100,100,120,140,140,160,180,180,200,220,220,240,260,260,280,300,300,320,350,400];
const rents = [[2,10,30,90,160,250],[4,20,60,180,320,450],[6,30,90,270,400,550],[6,30,90,270,400,550],[8,40,100,300,450,600],[10,50,150,450,625,750],[10,50,150,450,625,750],[12,60,180,500,700,900],[14,70,200,550,750,950],[14,70,200,550,750,950],[16,80,220,600,800,1000],[18,90,250,700,875,1050],[18,90,250,700,875,1050],[20,100,300,750,925,1100],[22,110,330,800,975,1150],[22,110,330,800,975,1150],[24,120,360,850,1025,1200],[26,130,390,900,1100,1275],[26,130,390,900,1100,1275],[28,150,450,1000,1200,1400],[35,175,500,1100,1300,1500],[50,200,600,1400,1700,2000]];
const palettes = ['#cf9a66','#b89b77','#c7976b','#8f8971','#d2b56b','#b0d1df','#899b67','#739b71','#6e9781','#6aa4ad','#a09d9c','#dea78b','#78aab5','#7e9a62','#77a6c8','#589fc5','#77c4c2','#bf543a','#799366','#9f967d','#7bbed1','#949bb6'];
const specials = {
  0:{type:'start',name:'Hyperspace',label:'COLLECT 200'}, 2:{type:'galactic',name:'Galactic Event'}, 4:{type:'tax',name:'Imperial Tax',tax:200},
  5:{type:'transport',name:'Millennium Falcon',price:200}, 7:{type:'force',name:'Force Event'}, 10:{type:'detention',name:'Detention',label:'JUST VISITING'},
  12:{type:'utility',name:'Power Generator',price:150}, 15:{type:'transport',name:'Star Destroyer',price:200}, 17:{type:'galactic',name:'Galactic Event'},
  20:{type:'parking',name:'Free Orbit',label:'TAKE A BREATHER'},22:{type:'force',name:'Force Event'},25:{type:'transport',name:'Rebel Blockade Runner',price:200},
  28:{type:'utility',name:'Holonet Relay',price:150},30:{type:'goDetention',name:'Imperial Patrol',label:'GO TO DETENTION'},33:{type:'galactic',name:'Galactic Event'},
  35:{type:'transport',name:'Executor',price:200},36:{type:'force',name:'Force Event'},38:{type:'tax',name:'Luxury Tax',tax:100},
};
export const BOARD = Array.from({length:40},(_,id)=>{
  if(specials[id]) return {id,...specials[id],mortgage:Math.floor((specials[id].price||0)/2)};
  const i=slots.indexOf(id), group=GROUPS[i<2?0:Math.min(7,1+Math.floor((i-2)/3))];
  return {id,type:'property',name:worlds[i],description:descriptions[worlds[i]],group:group.id,color:group.color,planetColor:palettes[i],price:prices[i],rents:rents[i],mortgage:prices[i]/2,buildCost:50*(1+Math.floor((id-1)/10)),source:`https://www.starwars.com/databank/${worlds[i].toLowerCase().replaceAll(' ','-')}`,eraNote:worlds[i]==='Ahch-To'?'Historical world; Luke’s exile belongs to the Rise of the First Order era.':worlds[i]==='Alderaan'?'Represented before its destruction. This board is a thematic tabletop map.':worlds[i]==='Scarif'?'Represented before the Battle of Scarif.':null};
});
export const CHARACTERS = [
  ['luke','Luke Skywalker','Rebel Alliance','#79b0dc','saber'],['vader','Darth Vader','Galactic Empire','#d76969','helmet'],
  ['leia','Princess Leia','Rebel Alliance','#bf9ad6','star'],['han','Han Solo','Rebel Alliance','#c7a873','ship'],
  ['chewie','Chewbacca','Rebel Alliance','#a99076','shield'],['yoda','Yoda','Jedi Order','#8ab793','saber'],
  ['obiwan','Obi-Wan Kenobi','Jedi Order','#82b7c4','saber'],['r2','R2-D2','Rebel Alliance','#82a6db','droid'],
  ['c3po','C-3PO','Rebel Alliance','#d9b86c','droid'],['boba','Boba Fett','Mandalorians','#86a989','helmet'],
  ['lando','Lando Calrissian','Rebel Alliance','#91b4c9','ship'],['palpatine','Emperor Palpatine','Sith','#a589bb','bolt'],
].map(([id,name,faction,color,symbol])=>({id,name,faction,color,symbol,available:true,owned:true}));
export const FACTIONS = ['Rebel Alliance','Galactic Empire','Jedi Order','Sith','Mandalorians','Galactic Republic','Separatists','First Order','Resistance'];
export const MODES = {classic:'Classic',quick:'Quick Match',teams:'Teams',solo:'Solo vs AI',custom:'Custom Rules'};
export const DEFAULT_RULES = {startingCredits:1500,startBonus:200,auctions:true,freeParking:false,incomeTax:200,luxuryTax:100,outposts:32,bases:12,trading:true,mortgageInterest:0.1,turnDuration:90,roundLimit:0,mortgages:true,difficulty:'medium',teams:false,sharedProperties:false,noTeamRent:true,duplicateCharacters:false};
