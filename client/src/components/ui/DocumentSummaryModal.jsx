import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
// Locally hosted official jQuery distribution (integrity checked in index.html).
const $ = window.jQuery;

export default function DocumentSummaryModal({doc,onClose}) {
  const dialog=useRef(null), tagsRoot=useRef(null), titleId=useId(), listId=useId();
  useEffect(()=>{const node=dialog.current;node.showModal();return ()=>node.close();},[]);
  useEffect(()=>{
    // This small jQuery enhancement is scoped to the tag filter, with namespaced cleanup.
    const root=$(tagsRoot.current), input=root.find('input'), tags=root.find('[data-summary-tag]');
    const filter=()=>{
      const query=String(input.val() || '').trim().toLowerCase();let count=0;
      tags.each(function(){const item=$(this),match=item.text().toLowerCase().includes(query);item.toggleClass('study-hidden',!match).toggleClass('study-match',match && !!query).attr('aria-hidden',String(!match));if(match)count++;});
      root.find('[role="status"]').text(`${count} of ${tags.length} tags shown`);
    };
    input.on('input.summary',filter).on('focus.summary',()=>input.attr('data-focused','true')).on('blur.summary',()=>input.removeAttr('data-focused'));
    filter();return ()=>input.off('.summary');
  },[doc.tags]);
  return createPortal(<dialog ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose();}} aria-labelledby={titleId} className="m-auto w-[min(92vw,600px)] max-h-[85vh] overflow-auto rounded-3xl p-7 shadow-2xl backdrop:bg-black/50 feature-enter">
    <header className="flex justify-between items-start gap-4"><div><h2 id={titleId} className="text-xl font-bold">Document summary</h2><p className="text-sm text-gray-500 break-all">{doc.name}</p></div><button autoFocus onClick={onClose} aria-label="Close summary" className="rounded-lg p-2 hover:bg-gray-100">✕</button></header>
    <section className="my-6"><h3 className="font-semibold mb-2">Saved summary</h3><p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{doc.extractedData?.summary || 'No summary was saved for this document. Analysis may not have completed during upload.'}</p></section>
    <section ref={tagsRoot}><h3 className="font-semibold mb-2">Saved tags</h3><label className="text-sm">Find a tag<input type="search" className="form-field" list={listId} autoComplete="off" placeholder="Filter the saved tags" /></label><datalist id={listId}>{(doc.tags||[]).map(tag=><option key={tag} value={tag}/>)}</datalist>
      <ul className="flex flex-wrap gap-2 my-3">{(doc.tags||[]).map(tag=><li key={tag} data-summary-tag className="px-3 py-1 rounded-full border text-sm">{tag}</li>)}</ul><p role="status" className="text-xs text-gray-500" />
    </section><footer className="mt-6 text-xs text-gray-500">Shows saved metadata. No new AI request is made.</footer>
  </dialog>,document.body);
}
