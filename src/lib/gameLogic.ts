import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  onSnapshot,
  Timestamp 
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "./firebase";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  role?: string;
}

export interface Room {
  id: string;
  status: 'lobby' | 'playing' | 'assassination' | 'ended';
  players: Player[];
  createdAt: Timestamp;
  missionResults: ('success' | 'fail')[];
  failedVotes: number;
  currentLeaderIndex: number;
  currentRound: number;
  teamSize: number;
  proposedTeam?: string[]; // プレイヤーIDの配列
  votes?: Record<string, 'approve' | 'reject'>; // UID -> 投票内容
  missionVotes?: ('success' | 'fail')[];
  phase: 'proposing' | 'voting' | 'mission' | 'result';
  winner?: 'Good' | 'Evil';
  assassinTarget?: string; //  assassinが選んだマーリンのPlayerID
}

// 匿名ログインしてUIDを取得
export const getPlayerId = async () => {
  console.log("getPlayerId: Checking current user...");
  if (!auth.currentUser) {
    console.log("getPlayerId: No user found, signing in anonymously...");
    try {
      const userCredential = await signInAnonymously(auth);
      console.log("getPlayerId: Anonymous sign-in success:", userCredential.user.uid);
      return userCredential.user.uid;
    } catch (error) {
      console.error("getPlayerId: Anonymous sign-in failed:", error);
      throw error;
    }
  }
  console.log("getPlayerId: Existing user found:", auth.currentUser.uid);
  return auth.currentUser.uid;
};

// ランダムなルームID（4桁英数）を作成
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

// ルーム作成
export const createRoom = async (playerName: string) => {
  console.log("createRoom: Starting for player:", playerName);
  const uid = await getPlayerId();
  const roomId = generateRoomId();
  
  const roomData: Room = {
    id: roomId,
    status: 'lobby',
    players: [
      { id: uid, name: playerName, isHost: true }
    ],
    createdAt: Timestamp.now(),
    missionResults: [],
    failedVotes: 0,
    currentLeaderIndex: 0,
    currentRound: 1,
    teamSize: 0,
    phase: 'proposing'
  };

  console.log("createRoom: Saving to Firestore, roomId:", roomId);
  try {
    await setDoc(doc(db, "rooms", roomId), roomData);
    console.log("createRoom: Firestore save success");
    return roomId;
  } catch (error) {
    console.error("createRoom: Firestore save failed:", error);
    throw error;
  }
};

// ルーム参加
export const joinRoom = async (roomId: string, playerName: string) => {
  const uid = await getPlayerId();
  const roomRef = doc(db, "rooms", roomId.toUpperCase());
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error("ルームが見つかりません。");
  }

  const roomData = roomSnap.data() as Room;
  
  // 既に参加しているかチェック
  if (roomData.players.find(p => p.id === uid)) {
    return roomId;
  }

  // 最大10人
  if (roomData.players.length >= 10) {
    throw new Error("このルームは満員です。");
  }

  await updateDoc(roomRef, {
    players: arrayUnion({ id: uid, name: playerName, isHost: false })
  });

  return roomId;
};

// ルーム情報をリアルタイム購読
export const subscribeRoom = (roomId: string, callback: (room: Room) => void) => {
  return onSnapshot(doc(db, "rooms", roomId), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as Room);
    }
  });
};
// 陣営と役職の定数
export const ROLES = {
  MERLIN: 'Merlin (正義)',
  PERCIVAL: 'Percival (正義)',
  SERVANT: 'アーサーの忠実なる家来 (正義)',
  ASSASSIN: 'Assassin (邪悪)',
  MORGANA: 'Morgana (邪悪)',
  MORDRED: 'Mordred (邪悪)',
  OBERON: 'Oberon (邪悪)',
  MINION: 'モードレッドの邪悪な手先 (邪悪)'
};

// 人数に応じた役職配分
const getRoleSetup = (count: number) => {
  if (count === 5) return [ROLES.MERLIN, ROLES.PERCIVAL, ROLES.SERVANT, ROLES.ASSASSIN, ROLES.MORGANA];
  if (count === 6) return [ROLES.MERLIN, ROLES.PERCIVAL, ROLES.SERVANT, ROLES.SERVANT, ROLES.ASSASSIN, ROLES.MORGANA];
  if (count === 7) return [ROLES.MERLIN, ROLES.PERCIVAL, ROLES.SERVANT, ROLES.SERVANT, ROLES.ASSASSIN, ROLES.MORGANA, ROLES.OBERON];
  if (count === 8) return [ROLES.MERLIN, ROLES.PERCIVAL, ROLES.SERVANT, ROLES.SERVANT, ROLES.SERVANT, ROLES.ASSASSIN, ROLES.MORGANA, ROLES.MORDRED];
  if (count === 9) return [ROLES.MERLIN, ROLES.PERCIVAL, ROLES.SERVANT, ROLES.SERVANT, ROLES.SERVANT, ROLES.SERVANT, ROLES.ASSASSIN, ROLES.MORGANA, ROLES.MORDRED];
  if (count === 10) return [ROLES.MERLIN, ROLES.PERCIVAL, ROLES.SERVANT, ROLES.SERVANT, ROLES.SERVANT, ROLES.SERVANT, ROLES.ASSASSIN, ROLES.MORGANA, ROLES.MORDRED, ROLES.OBERON];
  return [];
};

// シャッフル
const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// ゲーム開始（役職配布）
export const startGame = async (roomId: string) => {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const room = roomSnap.data() as Room;
  const setup = getRoleSetup(room.players.length);
  const shuffledRoles = shuffle(setup);

  const updatedPlayers = room.players.map((p, i) => ({
    ...p,
    role: shuffledRoles[i]
  }));

  await updateDoc(roomRef, {
    players: updatedPlayers,
    status: 'playing',
    phase: 'proposing',
    currentLeaderIndex: 0,
    currentRound: 1,
    teamSize: getTeamSize(updatedPlayers.length, 1),
    missionResults: [],
    failedVotes: 0
  });
};

// チーム提案
export const proposeTeam = async (roomId: string, teamIds: string[]) => {
  const roomRef = doc(db, "rooms", roomId);
  await updateDoc(roomRef, {
    proposedTeam: teamIds,
    phase: 'voting',
    votes: {}
  });
};

// チームへの投票
export const voteOnTeam = async (roomId: string, uid: string, vote: 'approve' | 'reject') => {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const room = roomSnap.data() as Room;
  const newVotes = { ...room.votes, [uid]: vote };

  // 全員投票したかチェック
  if (Object.keys(newVotes).length === room.players.length) {
    const approves = Object.values(newVotes).filter(v => v === 'approve').length;
    
    if (approves > room.players.length / 2) {
      // 承認時 -> ミッションフェーズへ
      await updateDoc(roomRef, {
        votes: newVotes,
        phase: 'mission',
        missionVotes: [],
        failedVotes: 0
      });
    } else {
      // 否決時 -> 次のリーダーへ
      const nextLeaderIndex = (room.currentLeaderIndex + 1) % room.players.length;
      const newFailedVotes = room.failedVotes + 1;
      
      if (newFailedVotes >= 5) {
        // 5回否決で邪悪の勝利
        await updateDoc(roomRef, {
          votes: newVotes,
          status: 'ended',
          winner: 'Evil'
        });
      } else {
        await updateDoc(roomRef, {
          votes: newVotes,
          phase: 'proposing',
          currentLeaderIndex: nextLeaderIndex,
          failedVotes: newFailedVotes,
          proposedTeam: []
        });
      }
    }
  } else {
    await updateDoc(roomRef, { votes: newVotes });
  }
};

// ミッションの実行（成功・失敗カード）
export const submitMissionVote = async (roomId: string, vote: 'success' | 'fail') => {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const room = roomSnap.data() as Room;
  const newMissionVotes = [...(room.missionVotes || []), vote];

  // 選ばれたメンバー全員出したかチェック
  if (newMissionVotes.length === (room.proposedTeam?.length || 0)) {
    // 失敗カードの必要数（通常1枚、7人以上の第4ミッションのみ2枚）
    const failThreshold = (room.players.length >= 7 && room.currentRound === 4) ? 2 : 1;
    const fails = newMissionVotes.filter(v => v === 'fail').length;
    const isSuccess = fails < failThreshold;

    const newMissionResults = [...room.missionResults, isSuccess ? 'success' : 'fail'];
    
    // 勝利判定
    const successCount = newMissionResults.filter(r => r === 'success').length;
    const failCount = newMissionResults.filter(r => r === 'fail').length;

    if (successCount >= 3) {
      // 正義の勝利（暗殺フェーズへ）
      await updateDoc(roomRef, {
        missionVotes: newMissionVotes,
        missionResults: newMissionResults,
        status: 'assassination'
      });
    } else if (failCount >= 3) {
       // 邪悪の勝利
       await updateDoc(roomRef, {
        missionVotes: newMissionVotes,
        missionResults: newMissionResults,
        status: 'ended',
        winner: 'Evil'
      });
    } else {
      // 次のラウンドへ
      const nextLeaderIndex = (room.currentLeaderIndex + 1) % room.players.length;
      const nextRound = room.currentRound + 1;
      await updateDoc(roomRef, {
        missionVotes: newMissionVotes,
        missionResults: newMissionResults,
        currentRound: nextRound,
        currentLeaderIndex: nextLeaderIndex,
        phase: 'proposing',
        proposedTeam: [],
        teamSize: getTeamSize(room.players.length, nextRound)
      });
    }
  } else {
    await updateDoc(roomRef, { missionVotes: newMissionVotes });
  }
};

// 暗殺（アサシンが実行）
export const assassinateMerlin = async (roomId: string, targetId: string) => {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const room = roomSnap.data() as Room;
  const target = room.players.find(p => p.id === targetId);
  const isCorrect = target?.role === ROLES.MERLIN;

  await updateDoc(roomRef, {
    assassinTarget: targetId,
    status: 'ended',
    winner: isCorrect ? 'Evil' : 'Good'
  });
};

// 遠征メンバー数 (人数, ラウンド)
const getTeamSize = (players: number, round: number) => {
  const table: Record<number, number[]> = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5]
  };
  return table[players][round - 1];
};

// 秘密情報の取得
export const getSecretInfo = (player: Player, allPlayers: Player[]) => {
  const role = player.role;
  const evilRoles = [ROLES.ASSASSIN, ROLES.MORGANA, ROLES.MORDRED, ROLES.OBERON, ROLES.MINION];
  const evilKnownToEvil = [ROLES.ASSASSIN, ROLES.MORGANA, ROLES.MORDRED, ROLES.MINION]; // Oberonは仲間から見えない
  
  // 邪悪な陣営の仲間を確認 (Oberon以外)
  if (evilKnownToEvil.includes(role as string)) {
    return allPlayers
      .filter(p => p.id !== player.id && evilKnownToEvil.includes(p.role as string))
      .map(p => p.name + " (邪悪な仲間)");
  }

  // マーリンが見えるもの
  if (role === ROLES.MERLIN) {
    // Mordred以外、かつ本人以外の邪悪な陣営が見える
    return allPlayers
      .filter(p => [ROLES.ASSASSIN, ROLES.MORGANA, ROLES.OBERON, ROLES.MINION].includes(p.role as string))
      .map(p => p.name + " (邪悪な気配)");
  }

  // パーシヴァルが見えるもの
  if (role === ROLES.PERCIVAL) {
    // マーリンとモルガナが「マーリン候補」として見える
    return allPlayers
      .filter(p => [ROLES.MERLIN, ROLES.MORGANA].includes(p.role as string))
      .map(p => p.name + " (マーリン候補)");
  }

  return [];
};
