import { File, Image, Loader2, Paperclip, Send, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { displayError } from "../../lib/chatUtils";
import { EmojiPicker } from "../common/EmojiPicker";
import { IconButton } from "../common/IconButton";

export function Composer({
  value,
  onChange,
  onSend,
  replyTo,
  editing,
  onCancelContext,
  onTyping,
  uploadFiles,
  attachmentsDisabled = false,
}) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [replyTo, editing]);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 150)}px`;
  }, [value]);

  const submit = async () => {
    if (busy) return;
    const text = value.trim();
    if (!text && files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const attachments = files.length ? await uploadFiles(files) : [];
      await onSend(text, attachments);
      setFiles([]);
    } catch (err) {
      setError(displayError(err, "Could not send message"));
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
    if (event.key === "Escape" && (replyTo || editing)) onCancelContext?.();
  };

  const addFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    if (attachmentsDisabled && picked.length) {
      setError("File attachments are disabled in this room");
      event.target.value = "";
      setShowAttach(false);
      return;
    }
    if (picked.length) setFiles((current) => [...current, ...picked]);
    event.target.value = "";
    setShowAttach(false);
  };

  const addPastedFiles = (event) => {
    const picked = Array.from(event.clipboardData?.files || []);
    if (!picked.length) return;
    if (attachmentsDisabled) {
      setError("File attachments are disabled in this room");
      event.preventDefault();
      return;
    }
    setFiles((current) => [...current, ...picked]);
  };

  return (
    <div className="composer-wrap">
      {(replyTo || editing) && (
        <div className={`composer-context ${editing ? "editing" : ""}`}>
          <span>
            <strong>{editing ? "Editing message" : "Replying"}</strong>
            <small>{editing?.text || replyTo?.text || "Attachment"}</small>
          </span>
          <IconButton title="Cancel" onClick={onCancelContext}><X size={16} /></IconButton>
        </div>
      )}
      {files.length > 0 && (
        <div className="pending-files">
          {files.map((file) => (
            <span key={`${file.name}-${file.lastModified}`}>
              {file.type?.startsWith("image/") ? <Image size={13} /> : <File size={13} />} {file.name}
              <button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="composer">
        <div className="composer-tool-wrap">
          <button
            type="button"
            className="composer-tool attachment-trigger"
            disabled={attachmentsDisabled}
            onClick={() => attachmentsDisabled ? setError("File attachments are disabled in this room") : setShowAttach((current) => !current)}
          >
            <Paperclip size={19} />
          </button>
          {showAttach && (
            <div className="attach-menu">
              <button type="button" onClick={() => fileRef.current?.click()}><Image size={17} /> Photo</button>
              <button type="button" onClick={() => fileRef.current?.click()}><File size={17} /> File</button>
            </div>
          )}
          <input ref={fileRef} type="file" multiple onChange={addFiles} />
        </div>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => { onChange(event.target.value); onTyping?.(); }}
          onKeyDown={handleKeyDown}
          onPaste={addPastedFiles}
          placeholder={editing ? "Edit message" : "Message"}
          rows={1}
        />
        <div className="emoji-menu-wrap">
          <button type="button" className={`composer-tool ${showEmoji ? "active" : ""}`} onClick={() => setShowEmoji((value) => !value)}>
            <Smile size={19} />
          </button>
          {showEmoji && (
            <div className="emoji-popover">
              <EmojiPicker compact onSelect={(emoji) => { onChange(`${value}${emoji}`); inputRef.current?.focus(); }} />
            </div>
          )}
        </div>
        <button type="button" className="send-button" disabled={busy || (!value.trim() && files.length === 0)} onClick={submit}>
          {busy ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
        </button>
      </div>
      {error && <p className="composer-error">{error}</p>}
    </div>
  );
}
