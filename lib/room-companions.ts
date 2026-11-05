export type RoomGift={id:string,kind:'cookie',sender:string,senderName:string,recipient:string,recipientName:string,created:number};
// The list intentionally contains no message text. Bodies have separate,
// completion-gated read rules and are fetched only when opening a ready note.
export type RoomLetter={id:string,sender:string,senderName:string,recipient:string,recipientName:string,round:number,created:number};
