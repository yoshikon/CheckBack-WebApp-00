const fetch = require('node-fetch');
async function test() {
  const db = require('better-sqlite3')('sqlite.db');
  const shareLink = db.prepare('SELECT token FROM share_links LIMIT 1').get();
  const comment = db.prepare('SELECT id FROM comments LIMIT 1').get();
  
  if (!shareLink || !comment) {
    console.log("No share link or comment found");
    return;
  }
  
  console.log(`Testing with token: ${shareLink.token}, commentId: ${comment.id}`);
  
  const res = await fetch(`http://localhost:5000/api/share/${shareLink.token}/comments/${comment.id}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: 'Test reply from script', guestName: 'Script' })
  });
  
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}
test();
