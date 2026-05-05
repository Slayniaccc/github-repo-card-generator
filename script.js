

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

`<img src="${result.avatar_url}"></img>
 <h1>${result.login}</h1>
 <p>${result.bio|| "No bio available"}</p>
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