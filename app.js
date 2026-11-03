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
function showProfile() {
  modal("Your profile",'<div class="profile-edit"><p><b>@'+esc(currentUser.username)+'</b></p><label class="field-label">Display name<input id="profileName" class="field" maxlength="40" value="'+esc(currentUser.display_name||"")+'"></label><label class="field-label">Bio<textarea id="profileBio" class="field" maxlength="160" rows="3">'+esc(currentUser.bio||"")+'</textarea></label><label class="privacy-toggle"><input type="checkbox" id="privateProfile" '+(currentUser.is_private?"checked":"")+'> Private account (recommended)</label><p class="muted small-note">When private, only followers you approve can see your posts.</p><button id="saveProfile" class="primary">Save profile</button><button id="logoutInProfile" class="secondary">Log out</button><p id="profileError" class="auth-error"></p></div>');
  $("#saveProfile").onclick=async()=>{
    try {const r=await api("update_profile",{display_name:$("#profileName").value,bio:$("#profileBio").value,is_private:$("#privateProfile").checked});currentUser=r.user;renderCurrentUser();$("#modal").classList.add("hidden");toast("Profile updated.");}
    catch(err){$("#profileError").textContent=err.message;}
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
  if(page==="messages"){$("#feed").innerHTML='<section class="empty-state"><h2>Messages</h2><p>Private messaging is not included in this first release.</p></section>';return;}
});
$("#mobileCreate").onclick=createModal;
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");toast("Theme updated.");};
(async()=>{
  if(token) { try {const data=await api("me");currentUser=data.user;await startApp();return;} catch {token="";sessionStorage.removeItem("im_session");} }
  showAuth();
})();
