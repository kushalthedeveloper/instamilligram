const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const API = "https://zffrvoarvgujgiyopufj.supabase.co/functions/v1/instamilligram-api";
const PUBLIC_KEY = "sb_publishable_D2oHJLE_aktYcIPw5QodSQ_FRb0o_bY";
let token = sessionStorage.getItem("im_session") || "";
let currentUser = null;
let authMode = "login";
let posts = [];

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const avatar = (user) => user?.avatar_url ? '<img class="avatar" src="'+esc(user.avatar_url)+'" alt="">' : '<div class="avatar gradient">'+esc((user?.display_name || user?.username || "?").slice(0,1).toUpperCase())+'</div>';
function toast(message) { const t=$("#toast"); t.textContent=message; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2600); }
async function api(action, data={}) {
  const headers = {"Content-Type":"application/json","apikey":PUBLIC_KEY};
  if (token) headers.Authorization = "Bearer " + token;
  const response = await fetch(API,{method:"POST",headers,body:JSON.stringify({action,...data})});
  const result = await response.json().catch(()=>({error:"Server returned an unreadable response."}));
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}
function setAuthMode(mode) {
  authMode=mode;
  $("#loginTab").classList.toggle("active",mode==="login");
  $("#signupTab").classList.toggle("active",mode==="signup");
  $("#displayNameWrap").classList.toggle("hidden",mode!=="signup");
  $("#authPassword").setAttribute("autocomplete",mode==="login"?"current-password":"new-password");
  $("#authPassword").placeholder=mode==="login"?"Your password":"At least 10 characters";
  $("#authHint").textContent=mode==="login"?"Log in with your username and password. No email or phone required.":"Choose a username and a unique password. No email or phone required.";
  $("#authSubmit").textContent=mode==="login"?"Log in":"Create account";
  $("#authError").textContent="";
}
$("#loginTab").onclick=()=>setAuthMode("login");
$("#forgotPassword").onclick=showPasswordRecovery;
$("#signupTab").onclick=()=>setAuthMode("signup");
$("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const button=$("#authSubmit"); button.disabled=true; button.textContent=authMode==="login"?"Logging in…":"Creating account…";
  $("#authError").textContent="";
  try {
    const username=$("#authUsername").value.trim().toLowerCase();
    const password=$("#authPassword").value;
    const data=await api(authMode,{username,password,display_name:$("#authDisplayName").value.trim()});
    token=data.token; sessionStorage.setItem("im_session",token); currentUser=data.user;
    $("#authPassword").value="";
    await startApp();
  } catch(err) { $("#authError").textContent=err.message; }
  finally { button.disabled=false; button.textContent=authMode==="login"?"Log in":"Create account"; }
});
function showPasswordRecovery() {
  modal("Reset your password",'<p class="muted">Enter your username. If a verified recovery contact is saved, we will send a one-time code to it.</p><label class="field-label">Username<input id="resetUsername" class="field" autocomplete="username" placeholder="your_username"></label><button id="requestResetCode" class="secondary">Send recovery code</button><div id="resetFields" class="hidden"><label class="field-label">6-digit code<input id="resetCode" class="field" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label><label class="field-label">New password<input id="resetNewPassword" class="field" type="password" minlength="10" maxlength="72" autocomplete="new-password"></label><button id="confirmPasswordReset" class="primary">Update password</button></div><p id="resetError" class="auth-error" role="alert"></p>');
  $("#requestResetCode").onclick=async()=>{try{await api("request_password_reset",{username:$("#resetUsername").value.trim()});$("#resetFields").classList.remove("hidden");$("#resetError").textContent="If the account has a verified recovery method and delivery is configured, a code will arrive shortly.";}catch(err){$("#resetError").textContent=err.message;}};
  $("#confirmPasswordReset").onclick=async()=>{try{await api("reset_password",{username:$("#resetUsername").value.trim(),code:$("#resetCode").value.trim(),new_password:$("#resetNewPassword").value});$("#modal").classList.add("hidden");toast("Password updated. Log in with your new password.");}catch(err){$("#resetError").textContent=err.message;}};
}

function showAuth() { $("#authScreen").classList.remove("hidden"); $("#mainApp").classList.add("hidden"); }
function showApp() { $("#authScreen").classList.add("hidden"); $("#mainApp").classList.remove("hidden"); }
async function startApp() {
  if(!currentUser) {
    try { const data=await api("me"); currentUser=data.user; }
    catch { token=""; sessionStorage.removeItem("im_session"); showAuth(); return; }
  }
  showApp(); renderCurrentUser(); renderStories(); renderSuggestions(); await loadFeed();
}
function renderCurrentUser() {
  $("#currentUserMini").innerHTML=avatar(currentUser)+'<div><b>'+esc(currentUser.username)+'</b><small>'+esc(currentUser.display_name||"Your account")+'</small></div><button class="link" id="logoutBtn">Log out</button>';
  $("#logoutBtn").onclick=logout;
}
async function logout() {
  try { await api("logout"); } catch {}
  token=""; currentUser=null; sessionStorage.removeItem("im_session"); posts=[]; showAuth(); toast("You have logged out.");
}
function renderStories() {
  $("#stories").innerHTML='<div class="story"><div class="story-ring seen"><div class="story-face">＋</div></div>Your story</div><div class="story"><div class="story-ring"><div class="story-face">im</div></div>Discover</div>';
}
function renderSuggestions() {
  $("#suggestions").innerHTML='<p class="muted small-note">Find people by username using Search. New accounts start private, and follow requests need approval.</p>';
}
async function loadFeed() {
  $("#feed").innerHTML='<p class="muted loading">Loading your feed…</p>';
  try {
    const data=await api("feed"); posts=data.posts||[]; renderFeed();
  } catch(err) { $("#feed").innerHTML='<p class="muted">'+esc(err.message)+'</p>'; }
}
function renderFeed() {
  if(!posts.length) {
    $("#feed").innerHTML='<section class="empty-state"><div class="empty-icon">✦</div><h2>Your feed starts here</h2><p>Follow people, approve your followers, or share your first photo.</p><button class="primary" id="emptyCreate">Create a post</button></section>';
    $("#emptyCreate").onclick=createModal; return;
  }
  $("#feed").innerHTML=posts.map(p=>{
    const author=p.app_users||p.author||{};
    const comments=(p.comments||[]).map(c=>'<div class="comment-line"><b>'+esc(c.app_users?.username||"user")+'</b> '+esc(c.body)+'</div>').join("");
    return '<article class="post" data-post="'+esc(p.id)+'"><div class="post-head">'+avatar(author)+'<div><span class="post-user">'+esc(author.username||"member")+'</span><span class="post-location">'+(author.is_private?"Private account":"Instamilligram")+'</span></div><button class="more report-post" data-id="'+esc(p.id)+'" aria-label="Report post">···</button></div><img class="post-image" src="'+esc(p.image_url)+'" alt="Post by '+esc(author.username||"member")+'" loading="lazy" referrerpolicy="no-referrer"><div class="post-actions"><button class="action like '+(p.liked?"liked":"")+'" data-id="'+esc(p.id)+'" aria-label="Like post">'+(p.liked?"♥":"♡")+'</button><button class="action comment-focus" data-id="'+esc(p.id)+'" aria-label="Comment">♧</button><button class="action bookmark" aria-label="Save post">♧</button></div><div class="post-copy"><b class="like-count">'+Number(p.likes||0).toLocaleString()+' likes</b><br><b>'+esc(author.username||"member")+'</b> '+esc(p.caption||"")+'<div class="comments" id="comments-'+esc(p.id)+'">'+comments+'</div></div><form class="add-comment" data-id="'+esc(p.id)+'"><input name="comment" maxlength="1000" placeholder="Add a comment…" autocomplete="off"><button class="link" type="submit">Post</button></form></article>';
  }).join("");
}
function modal(title,html) { $("#modalTitle").textContent=title; $("#modalBody").innerHTML=html; $("#modal").classList.remove("hidden"); }
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden");};
function createModal() {
  modal("Create a post",'<p class="muted">For now, add a public HTTPS image link. Direct photo uploads are not enabled yet.</p><label class="field-label">Image URL<input class="field" id="postUrl" type="url" placeholder="https://example.com/photo.jpg"></label><label class="field-label">Caption<textarea class="field" id="postCaption" maxlength="2200" rows="4" placeholder="Write a caption…"></textarea></label><p id="createError" class="auth-error"></p><button class="primary" id="publish">Share post</button>');
  $("#publish").onclick=async()=>{
    const btn=$("#publish"); btn.disabled=true;
    try {
      await api("create_post",{image_url:$("#postUrl").value.trim(),caption:$("#postCaption").value.trim()});
      $("#modal").classList.add("hidden"); toast("Post shared."); await loadFeed();
    } catch(err) { $("#createError").textContent=err.message; }
    finally { btn.disabled=false; }
  };
}
document.addEventListener("click",async e=>{
  const like=e.target.closest(".like");
  if(like) {
    const p=posts.find(x=>x.id===like.dataset.id); if(!p)return;
    like.disabled=true;
    try { const r=await api("toggle_like",{post_id:p.id}); p.liked=r.liked; p.likes=Math.max(0,Number(p.likes)+(r.liked?1:-1)); renderFeed(); }
    catch(err){toast(err.message);} finally {like.disabled=false;}
  }
  const comment=e.target.closest(".comment-focus");
  if(comment) document.querySelector('.add-comment[data-id="'+CSS.escape(comment.dataset.id)+'"] input')?.focus();
  const report=e.target.closest(".report-post");
  if(report) {
    const reason=prompt("Why are you reporting this post? Please keep it brief.");
    if(reason) try {await api("report",{post_id:report.dataset.id,reason});toast("Report submitted for review.");}catch(err){toast(err.message);}
  }
  const follow=e.target.closest(".follow-user");
  if(follow) {
    follow.disabled=true;
    try {const r=await api("follow",{user_id:follow.dataset.id});follow.textContent=r.status==="pending"?"Requested":"Following";toast(r.status==="pending"?"Follow request sent.":"Following.");}
    catch(err){toast(err.message);follow.disabled=false;}
  }
  const approve=e.target.closest(".approve-follow");
  if(approve) {
    try {await api("approve_follow",{user_id:approve.dataset.id});approve.closest(".request-row").remove();toast("Follow request approved.");}
    catch(err){toast(err.message);}
  }
});
document.addEventListener("submit",async e=>{
  if(e.target.matches(".add-comment")) {
    e.preventDefault(); const form=e.target; const field=form.elements.comment; const value=field.value.trim(); if(!value)return;
    const btn=form.querySelector("button");btn.disabled=true;
    try {await api("comment",{post_id:form.dataset.id,body:value});field.value="";toast("Comment added.");await loadFeed();}
    catch(err){toast(err.message);}finally{btn.disabled=false;}
  }
});

async function showMessages() {
  $("#feed").innerHTML='<div class="messages-head"><div><h2>Messages</h2><p class="muted">Private text chats with mutual followers.</p></div><button class="secondary" id="refreshMessages">Refresh</button></div><div id="messageInbox" class="message-inbox">Loading conversations…</div><div id="messagePanel" class="message-panel hidden"></div>';
  $("#refreshMessages").onclick=showMessages;
  try {
    const data=await api("inbox");
    const rows=data.conversations||[];
    $("#messageInbox").innerHTML=rows.map(c=>'<button class="conversation-row open-conversation" data-id="'+esc(c.user_id)+'" data-name="'+esc(c.user.username||"member")+'">'+avatar(c.user)+'<span class="conversation-copy"><b>'+esc(c.user.username||"member")+'</b><small>'+esc(c.last_message||"Start a conversation")+'</small></span>'+(c.unread?'<span class="unread-dot" aria-label="Unread"></span>':'')+'</button>').join("")||'<div class="empty-state"><h3>No conversations yet</h3><p>Search for someone you know. Messaging unlocks only after you both follow each other.</p><button class="primary" id="findChatPeople">Find people</button></div>';
    $("#findChatPeople")?.addEventListener("click",showSearch);
  } catch(err) { $("#messageInbox").textContent=err.message; }
}
async function openMessageThread(userId, username) {
  const panel=$("#messagePanel");
  panel.classList.remove("hidden");
  panel.dataset.userId=userId; panel.dataset.username=username;
  panel.innerHTML='<div class="thread-head"><button class="link" id="backToInbox">← Inbox</button><b>@'+esc(username)+'</b></div><div class="thread-messages" id="threadMessages">Loading…</div><form id="sendMessageForm" class="send-message-form"><input name="message" maxlength="1000" placeholder="Write a message…" autocomplete="off" required><button class="primary" type="submit">Send</button></form><p class="muted small-note">Text-only. You can message only after you both follow each other.</p>';
  $("#backToInbox").onclick=()=>panel.classList.add("hidden");
  try {
    const data=await api("message_thread",{user_id:userId});
    $("#threadMessages").innerHTML=(data.messages||[]).map(m=>'<div class="message-bubble '+(m.sender_id===currentUser.id?"mine":"theirs")+'">'+esc(m.body)+'<small>'+new Date(m.created_at).toLocaleString()+'</small></div>').join("")||'<p class="muted thread-empty">No messages yet. Messaging unlocks after mutual follow.</p>';
    $("#threadMessages").scrollTop=$("#threadMessages").scrollHeight;
  } catch(err) { $("#threadMessages").textContent=err.message; }
}
document.addEventListener("click",e=>{
  const open=e.target.closest(".open-conversation");
  if(open) openMessageThread(open.dataset.id,open.dataset.name);
});
document.addEventListener("submit",async e=>{
  if(!e.target.matches("#sendMessageForm")) return;
  e.preventDefault();
  const form=e.target, input=form.elements.message, body=input.value.trim();
  if(!body) return;
  const btn=form.querySelector("button"); btn.disabled=true;
  try {
    await api("send_message",{user_id:$("#messagePanel").dataset.userId,body});
    input.value="";
    await openMessageThread($("#messagePanel").dataset.userId,$("#messagePanel").dataset.username);
    toast("Message sent.");
  } catch(err) { toast(err.message); }
  finally { btn.disabled=false; }
});
async function showSearch() {
  $("#feed").innerHTML='<h2>Find people</h2><input class="search-box" id="searchInput" placeholder="Search usernames…"><div id="searchResults"></div>';
  const input=$("#searchInput"); input.focus();
  input.oninput=async()=>{
    const q=input.value.trim(); if(q.length<2){$("#searchResults").innerHTML="";return;}
    try {
      const data=await api("search_users",{query:q});
      $("#searchResults").innerHTML=(data.users||[]).map(u=>'<div class="suggestion"><div class="avatar">'+esc((u.display_name||u.username).slice(0,1).toUpperCase())+'</div><div><b>'+esc(u.username)+'</b><small>'+esc(u.display_name||"")+(u.is_private?" · Private":"")+'</small></div><button class="link follow-user" data-id="'+esc(u.id)+'">Follow</button></div>').join("")||'<p class="muted">No matching accounts.</p>';
    }catch(err){$("#searchResults").innerHTML='<p class="muted">'+esc(err.message)+'</p>';}
  };
}
async function showRequests() {
  $("#feed").innerHTML='<h2>Follow requests</h2><p class="muted">Approve people before they can see your private posts.</p><div id="requestList" class="request-list">Loading…</div>';
  try {
    const data=await api("follow_requests");
    $("#requestList").innerHTML=(data.requests||[]).map(r=>{const u=r.app_users||{};return '<div class="suggestion request-row">'+avatar(u)+'<div><b>'+esc(u.username||"member")+'</b><small>Wants to follow you</small></div><button class="link approve-follow" data-id="'+esc(r.follower_id)+'">Approve</button></div>';}).join("")||'<p class="muted">No pending requests.</p>';
  }catch(err){$("#requestList").textContent=err.message;}
}
async function showProfile() {
  modal("Your profile & security",'<div class="profile-edit"><p><b>@'+esc(currentUser.username)+'</b></p><label class="field-label">Display name<input id="profileName" class="field" maxlength="40" value="'+esc(currentUser.display_name||"")+'"></label><label class="field-label">Bio<textarea id="profileBio" class="field" maxlength="160" rows="3">'+esc(currentUser.bio||"")+'</textarea></label><label class="privacy-toggle"><input type="checkbox" id="privateProfile" '+(currentUser.is_private?"checked":"")+'> Private account (recommended)</label><p class="muted small-note">Only approved followers can see your private posts.</p><button id="saveProfile" class="primary">Save profile</button><hr><h3>Account recovery</h3><p id="recoveryStatus" class="muted">Checking recovery method…</p><label class="field-label">Recovery method<select id="recoveryMethod" class="field"><option value="email">Email address</option><option value="phone">Mobile number</option></select></label><label class="field-label">Email or mobile number<input id="recoveryContact" class="field" autocomplete="off" placeholder="name@example.com or +919876543210"></label><button id="sendRecoveryCode" class="secondary">Send verification code</button><div id="recoveryVerifyWrap" class="hidden"><label class="field-label">6-digit verification code<input id="recoveryCode" class="field" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label><button id="verifyRecoveryCode" class="primary">Verify and save recovery method</button></div><p id="recoveryError" class="auth-error" role="alert"></p><p class="muted small-note">A verified email or phone can be used to reset your password. No OTP is required to sign up or log in. Enter contact details only inside this secure account screen.</p><button id="logoutInProfile" class="secondary">Log out</button></div>');
  try {
    const r=await api("get_recovery_status");
    $("#recoveryStatus").textContent=r.recovery?(r.recovery.method==="email"?"Verified email: ":"Verified phone: ")+r.recovery.masked:"No verified recovery method saved.";
    if(r.recovery) $("#recoveryMethod").value=r.recovery.method;
  } catch(err) { $("#recoveryStatus").textContent=err.message; }
  $("#saveProfile").onclick=async()=>{
    try {const r=await api("update_profile",{display_name:$("#profileName").value,bio:$("#profileBio").value,is_private:$("#privateProfile").checked});currentUser=r.user;renderCurrentUser();toast("Profile updated.");}
    catch(err){$("#recoveryError").textContent=err.message;}
  };
  $("#sendRecoveryCode").onclick=async()=>{
    const btn=$("#sendRecoveryCode");btn.disabled=true;$("#recoveryError").textContent="";
    try {await api("set_recovery_method",{method:$("#recoveryMethod").value,contact:$("#recoveryContact").value.trim()});$("#recoveryVerifyWrap").classList.remove("hidden");toast("Verification code sent.");}
    catch(err){$("#recoveryError").textContent=err.message;}
    finally{btn.disabled=false;}
  };
  $("#verifyRecoveryCode").onclick=async()=>{
    try {await api("verify_recovery_method",{code:$("#recoveryCode").value.trim()});$("#recoveryVerifyWrap").classList.add("hidden");$("#recoveryContact").value="";const r=await api("get_recovery_status");$("#recoveryStatus").textContent=r.recovery.method==="email"?"Verified email: "+r.recovery.masked:"Verified phone: "+r.recovery.masked;toast("Recovery method verified.");}
    catch(err){$("#recoveryError").textContent=err.message;}
  };
  $("#logoutInProfile").onclick=logout;
}
$("#nav").addEventListener("click",async e=>{
  const b=e.target.closest("[data-page]");if(!b)return;
  $$(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  const page=b.dataset.page;
  if(page==="home"){await loadFeed();return;}
  if(page==="search"){await showSearch();return;}
  if(page==="create"){createModal();return;}
  if(page==="profile"){showProfile();return;}
  if(page==="notifications"){await showRequests();return;}
  if(page==="explore"){$("#feed").innerHTML='<section class="empty-state"><h2>Explore</h2><p>Search for usernames to discover accounts and request to follow them.</p><button class="primary" id="exploreSearch">Search people</button></section>';$("#exploreSearch").onclick=showSearch;return;}
  if(page==="messages"){await showMessages();return;}
});
$("#mobileCreate").onclick=createModal;
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");toast("Theme updated.");};
(async()=>{
  if(token) { try {const data=await api("me");currentUser=data.user;await startApp();return;} catch {token="";sessionStorage.removeItem("im_session");} }
  showAuth();
})();
