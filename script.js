console.log("KS");

const repoform = document.getElementById("repoform");
const username = document.getElementById("username");

repoform.addEventListener("submit" , repoFormClick);

function repoFormClick(event) {
    event.preventDefault();
const value = username.value


  githubSearch(value);
    
}



function githubSearch(userName){
getGithub(userName)
}
async function getGithub(userName){
  const url = `https://api.github.com/users/${userName}`;
  try{

const response = await fetch(url);
const result = await response.json()
const profile = document.getElementById("profile");
profile.innerHTML = 
`<h1>${result.name}</h1>
<img src="${result.avatar_url}">
 <p>${result.login}</p>
 <p>${result.bio}</p>
 <p>${result.followers}</p>
 <p>Public Repos: ${result.public_repos}</p>
 <a href="${result.html_url}">View Github Profile</a>`


    console.log(result);
  } catch (err){
    console.log(err)
  }
  }