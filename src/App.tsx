import { useEffect, useRef, useState } from 'react'
import './App.css'

type Track = { title: string; artist: string; year: number; genre: string; audio: string; artwork: string; color: string }

const fallbackTracks: Track[] = [
  { title: 'Hey Jude', artist: 'The Beatles', year: 1968, genre: 'Rock', audio: '', artwork: '', color: '#f27d52' },
  { title: 'Bohemian Rhapsody', artist: 'Queen', year: 1975, genre: 'Rock', audio: '', artwork: '', color: '#5d7df2' },
  { title: 'Billie Jean', artist: 'Michael Jackson', year: 1982, genre: 'Pop', audio: '', artwork: '', color: '#42a98b' },
  { title: 'Blinding Lights', artist: 'The Weeknd', year: 2019, genre: 'Pop', audio: '', artwork: '', color: '#d3a34f' },
]
const hungarianFallbackTracks: Track[] = [
  { title: 'Mind1', artist: 'Azahriah', year: 2023, genre: 'Magyar pop', audio: '', artwork: '', color: '#f27d52' },
  { title: 'Olyan Ő', artist: 'Bagossy Brothers Company', year: 2017, genre: 'Magyar pop', audio: '', artwork: '', color: '#5d7df2' },
  { title: 'Minden szavaddal', artist: 'Halott Pénz', year: 2016, genre: 'Magyar pop', audio: '', artwork: '', color: '#42a98b' },
  { title: 'Petróleumlámpa', artist: 'Omega', year: 1969, genre: 'Magyar rock', audio: '', artwork: '', color: '#d3a34f' },
]

const catalogQueries = [
  'The Beatles Hey Jude', 'The Beatles Let It Be', 'Queen Bohemian Rhapsody', 'Michael Jackson Billie Jean', 'ABBA Dancing Queen', 'Whitney Houston I Wanna Dance with Somebody', 'Nirvana Smells Like Teen Spirit', 'Oasis Wonderwall', 'Bon Jovi Livin on a Prayer', 'Eagles Hotel California', 'Elton John Rocket Man', 'Madonna Like a Prayer', 'Celine Dion My Heart Will Go On', 'Britney Spears Toxic', 'Rihanna Umbrella', 'Lady Gaga Bad Romance', 'Adele Rolling in the Deep', 'Ed Sheeran Shape of You', 'Bruno Mars Uptown Funk', 'Taylor Swift Shake It Off', 'The Weeknd Blinding Lights', 'Dua Lipa Levitating', 'Harry Styles As It Was', 'Billie Eilish bad guy', 'Miley Cyrus Flowers', 'Sia Chandelier', 'Coldplay Viva La Vida', 'Maroon 5 Sugar', 'Justin Bieber Sorry', 'Katy Perry Firework', 'Imagine Dragons Believer', 'Linkin Park In the End', 'Eminem Lose Yourself', 'Drake God’s Plan', 'Beyonce Halo', 'Shakira Hips Don’t Lie', 'David Guetta Titanium', 'Avicii Wake Me Up', 'Daft Punk Get Lucky', 'The Rolling Stones Paint It Black', 'The Doors Riders on the Storm', 'AC DC Back In Black', 'Metallica Nothing Else Matters', 'Red Hot Chili Peppers Californication', 'Green Day Boulevard of Broken Dreams', 'The Killers Mr Brightside', 'Amy Winehouse Back to Black', 'Snoop Dogg Drop It Like It’s Hot', '50 Cent In Da Club', 'Kendrick Lamar HUMBLE.', 'Post Malone Circles', 'Chris Brown No Guidance', 'Chris Brown Under the Influence', 'SZA Kill Bill', 'Sabrina Carpenter Espresso', 'Chappell Roan Good Luck Babe', 'Olivia Rodrigo good 4 u', 'Tate McRae greedy', 'Doja Cat Paint The Town Red', 'Central Cee Doja', 'Travis Scott SICKO MODE', 'Future Mask Off', 'Metro Boomin Creepin', 'Nicki Minaj Super Bass', 'Megan Thee Stallion HISS', 'Tyler The Creator EARFQUAKE', 'Bad Bunny Tití Me Preguntó', 'Rema Calm Down', 'Burna Boy Last Last', 'Tyla Water', 'Tems Free Mind', 'Jack Harlow Lovin On Me', 'Ice Spice Munch', 'Vini Tenny',
]
const hungarianQueries = ['Azahriah Mind1', 'Azahriah introvertált dal', 'DESH Bármi', 'DESH Pannonia', 'Manuel Messziről', 'Manuel Mivan veled', 'T. Danny Faszagyerek', 'T. Danny Megmondtam', 'KKevin Bentley', 'KKevin Hideg', 'Bruno x Spacc Adel', 'Bruno x Spacc Túl sok', 'Nagy Bogi Gyönyörű halott', 'Bagossy Brothers Company Olyan Ő', 'Halott Pénz Minden szavaddal', 'Tankcsapda Mennyország Tourist', 'Follow The Flow Nem tudja senki', 'Wellhello Rakpart', 'Carson Coma Feldobom a követ', 'Dzsúdló Függő', 'Margaret Island Eső', 'Quimby Most múlik pontosan', 'Republic 67-es út', 'Omega Petróleumlámpa', 'LGT Miénk itt a tér', 'Neoton Família Santa Maria', 'Kowalsky meg a Vega Amilyen hülye vagy', 'Rúzsa Magdi Hip-hop', 'Irie Maffia Örökké', 'Kispál és a Borz Ha az életben', 'Zorán Kell ott fenn egy ország', 'Punnany Massif Élvezd']
const colors = ['#f27d52', '#5d7df2', '#42a98b', '#d3a34f', '#c4779f', '#7ca5a8']
type ItunesResult = { trackName?: string; artistName?: string; releaseDate?: string; primaryGenreName?: string; previewUrl?: string; artworkUrl100?: string }
type LeaderboardEntry = { name: string; score: number }
type PartyRoom = { code: string; players: string[]; leader: string; started: boolean; leaderboard: LeaderboardEntry[] }
const randomTrackIndex = (length: number, excluded: number) => {
  if (length < 2) return 0
  let next = Math.floor(Math.random() * length)
  while (next === excluded) next = Math.floor(Math.random() * length)
  return next
}

function App() {
  const audioRef = useRef<HTMLAudioElement>(null)
   const socketRef = useRef<WebSocket | null>(null)
  const [screen, setScreen] = useState<'lobby' | 'party-room' | 'game'>('lobby')
  const [partyMode, setPartyMode] = useState(false)
  const [isLeader, setIsLeader] = useState(false)
  const [partyPlayers, setPartyPlayers] = useState<string[]>([])
  const [partyCode, setPartyCode] = useState('')
  const [playerName, setPlayerName] = useState('Játékos')
  const [joinCode, setJoinCode] = useState(() => new URLSearchParams(window.location.search).get('party')?.toUpperCase() ?? '')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [joinError, setJoinError] = useState('')
  const [roundLimit, setRoundLimit] = useState(10)
  const [musicMode, setMusicMode] = useState<'international' | 'hungarian'>('international')
  const [tracks, setTracks] = useState<Track[]>(fallbackTracks)
  const [trackIndex, setTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [guess, setGuess] = useState(2017)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [showRoundLeaderboard, setShowRoundLeaderboard] = useState(false)
  const track = tracks[trackIndex]
  const yearDistance = Math.abs(guess - track.year)
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${track.artist} ${track.title}`)}`

 const sendPartyMessage = (message: object) => socketRef.current?.send(JSON.stringify(message))
 const selectRemoteTrack = (remoteTrack: Track) => {
   setTracks((currentTracks) => {
     const existingIndex = currentTracks.findIndex((item) => item.title === remoteTrack.title && item.artist === remoteTrack.artist)
     if (existingIndex >= 0) { setTrackIndex(existingIndex); return currentTracks }
     setTrackIndex(0); return [remoteTrack, ...currentTracks]
   })
 }

 useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `ws://${window.location.hostname}:8787`
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
    const socket = new WebSocket(socketUrl)
   socketRef.current = socket
   socket.onmessage = (event) => {
    const message = JSON.parse(event.data) as { type: string; room?: PartyRoom; track?: Track; leader?: boolean; leaderboard?: LeaderboardEntry[]; message?: string }
     if (message.type === 'error') { setJoinError(message.message ?? 'Nem sikerült csatlakozni.'); return }
     if (message.type === 'room' && message.room) {
       setPartyCode(message.room.code); setPartyPlayers(message.room.players); setLeaderboard(message.room.leaderboard)
       setIsLeader(Boolean(message.leader) || message.room.leader === playerName)
       setPartyMode(true); setScreen(message.room.started ? 'game' : 'party-room')
     }
    if (message.type === 'started') { if (message.track) selectRemoteTrack(message.track); setScreen('game') }
    if (message.type === 'next' && message.track) { selectRemoteTrack(message.track); setRound((current) => current + 1); setGuess(2017); setResult('idle'); setIsPlaying(false) }
     if (message.type === 'leaderboard' && message.leaderboard) setLeaderboard(message.leaderboard)
   }
   return () => { socket.close(); socketRef.current = null }
 }, [playerName])

  const createPartyCode = () => {
    const name = playerName || 'Játékos'
    sendPartyMessage({ type: 'create', name })
  }
  const startSolo = () => { setPartyMode(false); setScreen('game') }
  const joinParty = () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) return
    setJoinError('')
    sendPartyMessage({ type: 'join', code, name: playerName || 'Játékos' })
  }
  const startParty = () => {
    sendPartyMessage({ type: 'start', track })
    setRound(1); setScore(0); setResult('idle')
  }

  const shareParty = async () => {
    const shareText = `Join my TrackBack party! Code: ${partyCode}`
    const shareUrl = `${window.location.origin}${window.location.pathname}?party=${partyCode}`
    if (navigator.share) { await navigator.share({ title: 'TrackBack party', text: shareText, url: shareUrl }).catch(() => undefined); return }
    await navigator.clipboard?.writeText(`${shareText} - ${shareUrl}`)
  }
  const changeMusicMode = (mode: 'international' | 'hungarian') => {
    setMusicMode(mode); setTracks(mode === 'hungarian' ? hungarianFallbackTracks : fallbackTracks); setTrackIndex(0); setIsCatalogLoading(true)
  }

  useEffect(() => {
    let cancelled = false
    const loadCatalog = async () => {
      const queries = musicMode === 'hungarian' ? hungarianQueries : catalogQueries
      const pages = await Promise.all(queries.map(async (query) => {
        const country = musicMode === 'hungarian' ? 'HU' : 'US'
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1&country=${country}`)
        const data = await response.json() as { results?: ItunesResult[] }
        return data.results ?? []
      }))
      const seen = new Set<string>()
      const loaded: Track[] = pages.flat().filter((item) => {
        const key = `${item.artistName}-${item.trackName}`
        return Boolean(item.trackName && item.artistName && item.previewUrl && item.releaseDate && !seen.has(key) && seen.add(key))
      }).map((item, index) => ({
        title: item.trackName!, artist: item.artistName!, year: Number(item.releaseDate!.slice(0, 4)),
        genre: item.primaryGenreName ?? 'Pop', audio: item.previewUrl!, artwork: item.artworkUrl100?.replace('100x100', '600x600') ?? '', color: colors[index % colors.length],
      })).filter((item) => item.year >= 1960 && item.year <= new Date().getFullYear())
      if (!cancelled && loaded.length > 0) { setTracks(loaded); setTrackIndex(randomTrackIndex(loaded.length, -1)) }
      if (!cancelled) setIsCatalogLoading(false)
    }
    void loadCatalog().catch(() => { if (!cancelled) setIsCatalogLoading(false) })
    return () => { cancelled = true }
  }, [musicMode])

  const togglePlayback = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); return }
    void audioRef.current.play(); setIsPlaying(true)
  }
  const submitGuess = () => {
    if (result !== 'idle') return
    const points = yearDistance === 0 ? 100 : Math.max(10, 100 - yearDistance * 10)
    setScore((current) => current + points); setResult(yearDistance === 0 ? 'correct' : 'wrong')
    if (partyMode) {
      setLeaderboard((current) => {
        const updated = [...current.filter((entry) => entry.name !== playerName), { name: playerName || 'Játékos', score: (current.find((entry) => entry.name === playerName)?.score ?? 0) + points }].sort((a, b) => b.score - a.score)
        sendPartyMessage({ type: 'score', points })
        return updated
      })
    }
    setShowRoundLeaderboard(true)
    window.setTimeout(() => { setShowRoundLeaderboard(false); if (round >= roundLimit) setScreen('lobby'); else nextTrack() }, 5000)
  }
  const nextTrack = () => {
    if (partyMode && !isLeader) return
    audioRef.current?.pause()
    const nextIndex = randomTrackIndex(tracks.length, trackIndex)
    if (partyMode) { sendPartyMessage({ type: 'next', track: tracks[nextIndex] }); return }
    setTrackIndex(nextIndex)
    setRound((current) => current + 1); setGuess(2017); setResult('idle'); setIsPlaying(false)
  }

  if (screen === 'lobby') return (
    <main className="app-shell lobby-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark">♫</span> TRACKBACK</div><div className="lobby-status">MUSIC YEAR GUESSING</div><div /></header>
      <section className="lobby"><div className="lobby-copy"><p className="eyebrow">IDŐVONAL // PARTY</p><h1>Találd ki.<br /><em>Játssz együtt.</em></h1><p className="lede">Hallgasd meg a részletet, tippelj az évre, és nézd meg, ki kerül a lista tetejére.</p></div><div className="lobby-card"><label>NEVED<input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Játékos" maxLength={18} /></label><div className="settings-grid"><label>KÖRÖK<select value={roundLimit} onChange={(event) => setRoundLimit(Number(event.target.value))}><option value={5}>5 kör</option><option value={10}>10 kör</option><option value={20}>20 kör</option></select></label><label>ZENE<select value={musicMode} onChange={(event) => changeMusicMode(event.target.value as 'international' | 'hungarian')}><option value="international">Külföldi</option><option value="hungarian">Magyar</option></select></label></div><button className="lobby-primary" type="button" onClick={startSolo}>EGYEDÜL JÁTSZOM <span>↗</span></button><div className="lobby-divider"><span>VAGY</span></div><button className="lobby-secondary" type="button" onClick={createPartyCode}>PARTY LÉTREHOZÁSA <span>＋</span></button><div className="join-row"><input value={joinCode} onChange={(event) => { setJoinCode(event.target.value.toUpperCase()); setJoinError('') }} placeholder="PARTY KÓD" maxLength={6} aria-label="Party kód" /><button type="button" onClick={joinParty} disabled={joinCode.length !== 6}>BELÉPÉS</button></div>{joinError && <p className="join-error">{joinError}</p>}<p className="lobby-note">A party-kódot a létrehozás után meg tudod osztani.</p></div></section>
    </main>
  )

  if (screen === 'party-room') return (
    <main className="app-shell lobby-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark">♫</span> TRACKBACK</div><div className="lobby-status">PARTY LOBBY</div><div /></header>
      <section className="party-room"><div className="party-room-copy"><p className="eyebrow">PARTY // VÁRÓSZOBA</p><h1>Játékosok,<br /><em>gyülekező.</em></h1><p className="lede">A játék akkor indul, amikor a party vezetője megnyomja az indítás gombot.</p><div className="room-settings"><span>{roundLimit} KÖR</span><span>{musicMode === 'hungarian' ? 'MAGYAR ZENE' : 'KÜLFÖLDI ZENE'}</span></div></div><div className="room-card"><p className="room-code-label">PARTY KÓD</p><strong className="room-code">{partyCode}</strong><button className="room-share" type="button" onClick={shareParty}>MEGOSZTÁS ↗</button><div className="players-heading"><span>JÁTÉKOSOK</span><span>{partyPlayers.length} / 8</span></div><div className="player-list">{partyPlayers.map((name, index) => <div className="player-row" key={`${name}-${index}`}><span className="player-avatar">{name.slice(0, 1).toUpperCase()}</span><strong>{name}</strong>{index === 0 && <em>LEADER</em>}</div>)}<div className="player-waiting">+ A többiek a kóddal csatlakozhatnak</div></div>{isLeader ? <button className="lobby-primary room-start" type="button" onClick={startParty}>JÁTÉK INDÍTÁSA <span>↗</span></button> : <p className="waiting-label">VÁRAKOZÁS A LEADER INDÍTÁSÁRA...</p>}</div></section>
    </main>
  )

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark">♫</span> TRACKBACK</div><div className="round-label">{partyMode ? <>PARTY <strong>{partyCode}</strong></> : <>ROUND <strong>{String(round).padStart(2, '0')}</strong> / {roundLimit}</>}</div><div className="score"><span>SCORE</span><strong>{score}</strong>{partyMode && <button className="share-button" type="button" onClick={shareParty} aria-label="Share party" title="Share party">↗</button>}</div></header>
      <section className="game-layout">
        <div className="intro"><p className="eyebrow">IDŐVONAL // 01</p><h1>Mikor született<br /><em>ez a hang?</em></h1><p className="lede">Hallgasd meg a rövid részletet, majd helyezd el a dalt az idővonalon.</p><div className="mini-stats"><span><b>50+</b> SLÁGER</span><span><b>100</b> MAX PONT</span><span><b>∞</b> PRÓBÁLKOZÁS</span></div></div>
        <div className="player-panel"><div className="album-art" style={{ '--track-color': track.color, backgroundImage: track.artwork ? `url(${track.artwork})` : undefined } as React.CSSProperties}>{!track.artwork && <><span className="art-number">{String(trackIndex + 1).padStart(2, '0')}</span><div className="waveform" aria-hidden="true">{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ height: `${22 + ((index * 17) % 64)}%` }} />)}</div><span className="art-caption">PREVIEW<br />ARCHIVE</span></>}<span className="art-censor">ÉV ELTAKARVA</span></div><div className="track-info"><div><span className="tag">{track.genre}</span><span className="duration">0:30</span></div><h2>{track.title}</h2><p>{track.artist}</p><a className="spotify-button" href={spotifyUrl} target="_blank" rel="noreferrer" aria-label={`${track.title} megnyitása Spotifyban`} title="Megnyitás Spotifyban"><svg viewBox="0 0 24 24" role="img" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M7 9.2c3.8-1.1 7.8-.7 10.4.5M7.5 12.4c3.2-.8 6.5-.4 8.8.6M8.2 15.4c2.5-.5 5-.2 6.8.5" /></svg></a></div>{track.audio && <audio ref={audioRef} src={track.audio} onEnded={() => setIsPlaying(false)} />}<button className={`play-button ${isPlaying ? 'playing' : ''}`} type="button" onClick={togglePlayback} disabled={!track.audio} aria-label={isPlaying ? 'Szünet' : 'Lejátszás'}>{isPlaying ? 'Ⅱ' : '▶'}</button><div className="progress-track"><span style={{ width: isPlaying ? '34%' : '0%' }} /></div><p className="source-note">{isCatalogLoading ? 'Ismert slágerek betöltése...' : '30 mp-es hivatalos iTunes preview'}</p></div>
        <div className="guess-panel"><div className="guess-heading"><span>TE TIPPED</span><strong>{guess}</strong></div><input className="year-slider" type="range" min="1960" max="2026" value={guess} onChange={(event) => setGuess(Number(event.target.value))} aria-label="Megjelenési év" /><div className="slider-labels"><span>1960</span><span>1980</span><span>2000</span><span>2020</span><span>2026</span></div><button className="submit-button" type="button" onClick={submitGuess} disabled={result !== 'idle'}>{result === 'idle' ? 'VÉGLEGESÍTEM A TIPPET' : 'TIPP ELKÜLDVE'} <span>↗</span></button>{result !== 'idle' && <div className={`result ${result}`}><strong>{result === 'correct' ? 'TELITALÁLAT!' : `${track.title} · ${track.artist}`}</strong><span>{result === 'correct' ? '+100 pont' : `Helyes év: ${track.year} · +${Math.max(10, 100 - yearDistance * 10)} pont`}</span></div>}</div>
      </section>
      {showRoundLeaderboard && <div className="round-board-backdrop"><section className="round-board" role="dialog" aria-label="Kör végi leaderboard"><p className="eyebrow">KÖR {String(round).padStart(2, '0')} // EREDMÉNY</p><h2>{partyMode ? 'PARTY LEADERBOARD' : 'KÖR VÉGI LEADERBOARD'}</h2><div className="round-board-answer">{result === 'correct' ? 'TELITALÁLAT!' : `A helyes év: ${track.year}`} <strong>{result === 'correct' ? '+100' : `+${Math.max(10, 100 - yearDistance * 10)}`} PONT</strong></div>{(partyMode ? leaderboard : [{ name: playerName || 'Játékos', score }]).slice(0, 5).map((entry, index) => <p className="round-board-row" key={entry.name}><b>{String(index + 1).padStart(2, '0')}</b><span>{entry.name}</span><strong>{entry.score}</strong></p>)}<small>A következő dal 5 másodperc múlva érkezik</small></section></div>}
      <footer className="timeline-footer"><span className="footer-dot" /> A ZENE NEM ISMER HATÁROKAT <span className="footer-line" /><span>{round < roundLimit ? 'KÖVETKEZŐ DALRA KÉSZEN?' : 'JÁTÉK VÉGE'}</span><button type="button" onClick={nextTrack} disabled={result === 'idle' || round >= roundLimit}>{result === 'idle' ? 'VÉGLEGESÍTS ELŐBB' : round >= roundLimit ? 'JÁTÉK VÉGE' : 'KÖVETKEZŐ DAL'} ↗</button></footer>
    </main>
  )
}

export default App
