// Keep unrelated UI tests isolated from a full scan of the user's drives.
require('../src/search-service').createSearchService=()=>({status:()=>({count:0,indexing:false,ready:true,skipped:0}),rebuild:async()=>({count:0,indexing:false,ready:true,skipped:0}),query:async()=>({items:[],truncated:false,index:{count:0,indexing:false,ready:true,skipped:0}}),cancel:()=>{},stop:()=>{}});
