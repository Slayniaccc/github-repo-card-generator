

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
  const url =  `https://api.github.com/users/${userName}` 
   
  try{

const response = await fetch(url);
const result = await response.json()
const profile = document.getElementById("profile");
profile.innerHTML = 
`<h1> Username: ${result.name}</h1>
<img src="${result.avatar_url}">
 <p>${result.login}</p>
 <p>${result.bio}</p>
 <p> Followers: ${result.followers}</p>
 <p>Public Repos: ${result.public_repos}</p>
 <a href="${result.html_url}" target="_blank">View Github Profile</a>`


    console.log(result);
  } catch (err){
    console.log(err)
  }
  }

  async function getRepos(userName){
    const url2 = `https://api.github.com/users/${userName}/repos` 
    try{
      const response2 = await fetch(url2);
const result2 = await response2.json()
console.log(result2)
    } catch (nope){
      console.log(nope)
    }
  }