

const repoForm = document.getElementById("repoForm");
const username = document.getElementById("username");
const reposDiv = document.getElementById("repos");

repoForm.addEventListener("submit" , repoFormClick);

function repoFormClick(event) {
    event.preventDefault();
const value = username.value


  githubSearch(value);
    
}



function githubSearch(userName){
getGithub(userName)
getRepos(userName)
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
 
  const sortedRepo = result2.sort((repo1, repo2) => repo2.stargazers_count - repo1.stargazers_count)
const topRepo = sortedRepo.slice(0, 5)
let repoHTML = ""
 topRepo.forEach(function(repo){

repoHTML += 
`<p> Repo Name: ${repo.name}</p>
<p> Repo Description: ${repo.description}</p>
<p> Repo Stars: ${repo.stargazers_count}</p>
<p> Repo Language: ${repo.language}</p>
 <a href="${repo.html_url}" target="_blank">View Github Repository</a>`

 })
reposDiv.innerHTML = repoHTML
  } catch(nope){
    console.log(nope)
  }}