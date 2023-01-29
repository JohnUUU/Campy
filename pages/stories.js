let enterRoom = function (roomID) {
    console.log(`Clicked ${roomID}`);
    localStorage.setItem("room", roomID);
    window.location.href = "../index.html";
}

const fires = document.getElementsByClassName('fire');
console.log(fires);
for (let i = 0; i < fires.length; i++) {
    fires[i].addEventListener('click', function () { enterRoom(fires[i].id) });
}