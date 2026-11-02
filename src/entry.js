if(new URLSearchParams(location.search).has('solo')||new URLSearchParams(location.search).has('partyHero'))await import('./main.js');else location.replace('/party.html'+location.search);
