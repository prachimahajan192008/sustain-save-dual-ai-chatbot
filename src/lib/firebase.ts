import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { BotType, ChatMessageItem } from '../types/platform';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firestore offline: check Firebase configuration.');
      return false;
    }
    return true;
  }
}

testConnection();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutFirebase() {
  return signOut(auth);
}

export async function syncAuthenticatedUserProfile(user: User) {
  if (!user.emailVerified) return;
  const userPath = `users/${user.uid}`;
  const isBootstrapAdmin =
    (user.email || '').toLowerCase() === 'prachiamahajan192008@gmail.com';
  try {
    const existingSnap = await getDocFromServer(doc(db, 'users', user.uid)).catch(
      () => null
    );
    if (!existingSnap || !existingSnap.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: (user.displayName || user.email?.split('@')[0] || 'User').slice(0, 120),
        role: isBootstrapAdmin ? 'SUPER_ADMIN' : 'WEBSITE_VISITOR',
        department: isBootstrapAdmin ? 'Executive & AI Governance' : 'Workspace',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await setDoc(
      doc(db, 'users', user.uid, 'private', 'info'),
      {
        uid: user.uid,
        email: (user.email || '').slice(0, 180),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    // Non-blocking if user already exists with admin-assigned role; surface real errors in console
    if (error instanceof Error && !error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  }
}

export async function persistChatTurnToFirestore(params: {
  botType: BotType;
  conversationId: string;
  userMessage: ChatMessageItem;
  assistantMessage: ChatMessageItem;
}) {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const convCollection =
    params.botType === 'website' ? 'website_conversations' : 'crm_conversations';
  const msgSubcollection =
    params.botType === 'website' ? 'website_messages' : 'crm_messages';
  const convPath = `${convCollection}/${params.conversationId}`;

  try {
    const convRef = doc(db, convCollection, params.conversationId);
    const snap = await getDocFromServer(convRef).catch(() => null);
    const prevCount = snap && snap.exists() ? Number(snap.data().messageCount || 0) : 0;
    const prevUnanswered =
      snap && snap.exists() ? Number(snap.data().unansweredCount || 0) : 0;

    if (!snap || !snap.exists()) {
      await setDoc(convRef, {
        ownerId: user.uid,
        botType: params.botType,
        title: params.userMessage.text.slice(0, 150),
        status: params.assistantMessage.escalated ? 'escalated' : 'active',
        unansweredCount: params.assistantMessage.escalated ? 1 : 0,
        messageCount: 2,
        lastMessagePreview: params.assistantMessage.text.slice(0, 280),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        convRef,
        {
          ownerId: snap.data().ownerId,
          botType: params.botType,
          title: snap.data().title,
          status: params.assistantMessage.escalated ? 'escalated' : snap.data().status,
          unansweredCount:
            prevUnanswered + (params.assistantMessage.escalated ? 1 : 0),
          messageCount: prevCount + 2,
          lastMessagePreview: params.assistantMessage.text.slice(0, 280),
          createdAt: snap.data().createdAt,
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
    }

    await setDoc(
      doc(db, convCollection, params.conversationId, msgSubcollection, params.userMessage.id),
      {
        ownerId: user.uid,
        sender: 'user',
        text: params.userMessage.text.slice(0, 12000),
        escalated: false,
        feedback: 'none',
        createdAt: serverTimestamp(),
      }
    );

    await setDoc(
      doc(
        db,
        convCollection,
        params.conversationId,
        msgSubcollection,
        params.assistantMessage.id
      ),
      {
        ownerId: user.uid,
        sender: 'assistant',
        text: params.assistantMessage.text.slice(0, 12000),
        escalated: Boolean(params.assistantMessage.escalated),
        feedback: 'none',
        sourceRefs: (params.assistantMessage.sourceRefs || []).join(', ').slice(0, 1000),
        hasChart: Boolean(params.assistantMessage.chart),
        createdAt: serverTimestamp(),
      }
    );
  } catch (err) {
    // Log structured Firestore error without interrupting user chat flow if visitor lacks CRM perms
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      console.warn('Firestore sync skipped for current role on', convPath);
    }
  }
}
