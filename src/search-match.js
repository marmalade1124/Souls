function scoreMatch(item,query){
  const name=item.name.toLowerCase(),full=item.path.toLowerCase(),words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!words.length)return -1;let score=0;
  for(const word of words){
    if(name===word)score+=1000;else if(name.startsWith(word))score+=600;else if(name.includes(word))score+=350;else if(full.includes(word))score+=100;
    else {if(words.length>1)return -1;let cursor=0;for(const ch of name)if(ch===word[cursor])cursor++;if(cursor!==word.length)return -1;score+=25;}
  }
  return score;
}
if(typeof module==='object')module.exports={scoreMatch};
