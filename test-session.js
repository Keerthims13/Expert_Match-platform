// Quick debug - check the session request that was created
import { sessionRepository } from './server/src/repositories/sessionRepository.js';

async function checkSession() {
  try {
    const sessions = await sessionRepository.findAllSessions();
    console.log('All sessions:');
    sessions.forEach((s, i) => {
      console.log(`\nSession ${i + 1}:`);
      console.log(`  ID: ${s.id}`);
      console.log(`  Doubt ID: ${s.doubt.id}`);
      console.log(`  Doubt Title: ${s.doubt.title}`);
      console.log(`  Expert Name: ${s.expert.fullName}`);
      console.log(`  Expert User ID: ${s.expert.userId}`);
      console.log(`  Status: ${s.status}`);
      console.log(`  Created At: ${s.createdAt}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkSession();
