const repoform = document.getElementById("repoform");
const username = document.getElementById("username");

repoform.addEventListener("submit" , repoFormClick);

function repoFormClick(event) {
    event.preventDefault();
const value = username.value

    console.log(value);
  
}