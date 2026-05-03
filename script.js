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
profile.innerHTML = `${result.name}, <img src="${result.avatar_url}">, ${result.login}`;

    console.log(result);
  } catch (err){
    console.log(err)
  }
}