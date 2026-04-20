async function test() {
  const apiKey = "AIzaSyApsuwN3-GC3WdF0VrNV2UwqJEToTAk9C0";
  const email = "test-qr-bod@facultyclub.local";
  const password = "securepassword123";
  
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });
  
  const data = await response.json();
  console.log(data);
}
test();
