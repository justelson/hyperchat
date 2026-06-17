import { X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { IconButton } from "../common/IconButton";

export function ThreadPanel({ token, currentUser, threadRoot, onClose, uploadFiles }) {
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const threadData = useQuery(api.messageThreads.listThreadReplies, token && threadRoot ? {
    authToken: token,
    rootMessageId: threadRoot.messageId || threadRoot._id,
    threadId: threadRoot.threadId || undefined,
  } : "skip");
  const sendReply = useMutation(api.messageThreads.sendThreadReply);
  const markRead = useMutation(api.messageThreads.markThreadRead);
  const editReply = useMutation(api.messageThreads.editThreadReply);
  const deleteReply = useMutation(api.messageThreads.deleteThreadReply);
  const reactReply = useMutation(api.messageThreads.toggleThreadReaction);
  const threadId = threadData?.thread?.threadId || threadRoot?.threadId;

  useEffect(() => {
    if (!threadId || !threadData?.replies?.length) return;
    const last = threadData.replies[threadData.replies.length - 1];
    markRead({ authToken: token, threadId, lastReadReplyId: last.messageId || last._id }).catch(() => {});
  }, [markRead, threadData?.replies, threadId, token]);

  if (!threadRoot) return null;

  const handleSend = async (text, attachments) => {
    if (editing && threadId) {
      await editReply({ authToken: token, threadId, messageId: editing.messageId || editing._id, text });
      setEditing(null);
      setReplyText("");
      return;
    }
    await sendReply({
      authToken: token,
      rootMessageId: threadRoot.messageId || threadRoot._id,
      text,
      attachments,
      quotedMessage: replyTo ? {
        messageId: replyTo.messageId || replyTo._id,
        text: replyTo.text,
        senderId: replyTo.senderId,
        createdAt: replyTo.createdAt,
      } : undefined,
    });
    setReplyTo(null);
    setReplyText("");
  };

  return (
    <aside className="thread-panel">
      <header>
        <div>
          <strong>Thread</strong>
          <small>{threadData?.thread?.threadReplyCount || 0} replies</small>
        </div>
        <IconButton title="Close thread" onClick={onClose}><X size={18} /></IconButton>
      </header>
      <div className="thread-root">
        <span>Root message</span>
        <p>{threadData?.rootMessage?.text || threadRoot.text || "Attachment"}</p>
      </div>
      <div className="thread-scroll">
        {threadData?.replies?.length ? threadData.replies.map((reply, index, rows) => (
          <MessageBubble
            key={reply.messageId || reply._id}
            message={reply}
            previous={rows[index - 1] ? { type: "message", message: rows[index - 1] } : null}
            next={rows[index + 1] ? { type: "message", message: rows[index + 1] } : null}
            currentUser={currentUser}
            onReply={setReplyTo}
            onThread={() => {}}
            onForward={() => {}}
            onEdit={(message) => { setEditing(message); setReplyText(message.text || ""); }}
            onDelete={(message) => threadId && deleteReply({ authToken: token, threadId, messageId: message.messageId || message._id })}
            onReaction={(message, emoji) => threadId && reactReply({ authToken: token, threadId, messageId: message.messageId || message._id, emoji })}
          />
        )) : <p className="thread-empty">No replies yet.</p>}
      </div>
      <Composer
        value={replyText}
        onChange={setReplyText}
        onSend={handleSend}
        replyTo={replyTo}
        editing={editing}
        onCancelContext={() => { setReplyTo(null); setEditing(null); setReplyText(""); }}
        uploadFiles={uploadFiles}
      />
    </aside>
  );
}
