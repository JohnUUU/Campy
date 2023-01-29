import './style.css'
import AgoraRTC from "agora-rtc-sdk-ng"
import AgoraRTM from "agora-rtm-sdk"

import appid from '../appId.js'


const token = null

const rtcUid = Math.floor(Math.random() * 2032)
const rtmUid = String(Math.floor(Math.random() * 2032))
const count = 0;
let inRoom = false;

const getRoomId = () => {
  let room = localStorage.getItem("room")
  if (room == null) {
    room = "My Campfire"
  }
  return room
}

let roomId = getRoomId()

let audioTracks = {
  localAudioTrack: null,
  remoteAudioTracks: {},
};

let micMuted = true

let rtcClient;
let rtmClient;
let channel;

let avatar;


const initRtm = async (name) => {

  rtmClient = AgoraRTM.createInstance(appid)
  await rtmClient.login({ 'uid': rtmUid, 'token': token })

  channel = rtmClient.createChannel(roomId)
  await channel.join()

  await rtmClient.addOrUpdateLocalUserAttributes({ 'name': name, 'userRtcUid': rtcUid.toString(), 'userAvatar': avatar })

  getChannelMembers()

  window.addEventListener('beforeunload', leaveRtmChannel)

  channel.on('MemberJoined', handleMemberJoined)
  channel.on('MemberLeft', handleMemberLeft)
}



const initRtc = async () => {
  rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });


  // rtcClient.on('user-joined', handleUserJoined)
  rtcClient.on("user-published", handleUserPublished)
  rtcClient.on("user-left", handleUserLeft);


  await rtcClient.join(appid, roomId, token, rtcUid)
  audioTracks.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  audioTracks.localAudioTrack.setMuted(micMuted)
  await rtcClient.publish(audioTracks.localAudioTrack);


  //document.getElementById('members').insertAdjacentHTML('beforeend', `<div class="speaker user-rtc-${rtcUid}" id="${rtcUid}"><p>${rtcUid}</p></div>`)

  initVolumeIndicator()
}

let initVolumeIndicator = async () => {

  //1
  AgoraRTC.setParameter('AUDIO_VOLUME_INDICATION_INTERVAL', 200);
  rtcClient.enableAudioVolumeIndicator();

  //2
  rtcClient.on("volume-indicator", volumes => {
    volumes.forEach((volume) => {
      console.log(`UID ${volume.uid} Level ${volume.level}`);

      //3
      try {
        let item = document.getElementsByClassName(`avatar-${volume.uid}`)[0]

        if (volume.level >= 50) {
          item.style.borderColor = '#00ff00'
        } else {
          item.style.borderColor = "#fff"
        }
      } catch (error) {
        console.error(error)
      }


    });
  })
}


// let handleUserJoined = async (user) => {
//   document.getElementById('members').insertAdjacentHTML('beforeend', `<div class="speaker user-rtc-${user.uid}" id="${user.uid}"><p>${user.uid}</p></div>`)
// }

let handleUserPublished = async (user, mediaType) => {
  await rtcClient.subscribe(user, mediaType);

  if (mediaType == "audio") {
    audioTracks.remoteAudioTracks[user.uid] = [user.audioTrack]
    user.audioTrack.play();
  }
}

let handleUserLeft = async (user) => {
  delete audioTracks.remoteAudioTracks[user.uid]
  document.getElementById(user.uid).remove()
}

let handleMemberJoined = async (MemberId) => {
  if (count < 5) {
    let { name, userRtcUid, userAvatar } = await rtmClient.getUserAttributesByKeys(MemberId, ['name', 'userRtcUid', 'userAvatar'])
    count++;
    let newMember = `
    <div class="member-${count}" id="${MemberId}">
      <img class="user-avatar avatar-${userRtcUid}" src="${userAvatar}"/>
        <p>${name}</p>
    </div>`

    document.getElementById("members").insertAdjacentHTML('beforeend', newMember)
  } else {
    alert("Sorry the Campfire is full");
    return;
  }

}

let handleMemberLeft = async (MemberId) => {
  count--;
  document.getElementById(MemberId).remove()
}

let getChannelMembers = async () => {
  let members = await channel.getMembers()

  for (let i = 0; members.length > i; i++) {

    let { name, userRtcUid, userAvatar } = await rtmClient.getUserAttributesByKeys(members[i], ['name', 'userRtcUid', 'userAvatar'])

    let newMember = `
    <div class="member-${i}" id="${members[i]}">
        <img class="user-avatar avatar-${userRtcUid}" src="${userAvatar}"/>
        <p class="name">${name}</p>
    </div>`

    document.getElementById("members").insertAdjacentHTML('beforeend', newMember)
  }
}

const toggleMic = async (e) => {
  if (micMuted) {
    e.target.src = 'icons/mic.svg'
    micMuted = false
  } else {
    e.target.src = 'icons/mic-off.svg'

    micMuted = true
  }
  audioTracks.localAudioTrack.setMuted(micMuted)
}


let lobbyForm = document.getElementById('form')

const enterRoom = async (e) => {
  inRoom = true;
  e.preventDefault()

  if (!avatar) {
    alert('Please select an avatar')
    return
  }

  window.history.replaceState(null, null, `?room=${roomId}`);

  initRtc()

  let displayName = e.target.displayname.value;
  initRtm(displayName)

  lobbyForm.style.display = 'none'
  document.getElementById('room-header').style.display = "flex"
  document.getElementById('room-name').innerText = roomId
}

let leaveRtmChannel = async () => {
  await channel.leave()
  await rtmClient.logout()
}

let leaveRoom = async () => {
  if (inRoom) {
    audioTracks.localAudioTrack.stop()
    audioTracks.localAudioTrack.close()
    rtcClient.unpublish()
    rtcClient.leave()

    leaveRtmChannel()

    document.getElementById('form').style.display = 'block'
    document.getElementById('room-header').style.display = 'none'
    document.getElementById('members').innerHTML = ''
    inRoom = false;
  } else {
    window.location.href = "pages/search.html";
  }
}

lobbyForm.addEventListener('submit', enterRoom)
document.getElementById('leave-icon').addEventListener('click', leaveRoom)
document.getElementById('mic-icon').addEventListener('click', toggleMic)


const avatars = document.getElementsByClassName('avatar-selection')
console.log(avatars);

for (let i = 0; avatars.length > i; i++) {

  avatars[i].addEventListener('click', () => {
    for (let i = 0; avatars.length > i; i++) {
      avatars[i].style.borderColor = "#fff"
      avatars[i].style.opacity = .5
    }

    avatar = avatars[i].src
    avatars[i].style.borderColor = "#00ff00"
    avatars[i].style.opacity = 1
  })
}