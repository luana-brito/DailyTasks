import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'

type ObservacoesRichEditorProps = {
  value: string
  onChange: (html: string) => void
  /** id de um elemento de rótulo (ex.: span antes do editor) */
  ariaLabelledBy?: string
}

export function ObservacoesRichEditor({ value, onChange, ariaLabelledBy }: ObservacoesRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank'
        }
      }),
      Placeholder.configure({
        placeholder: 'Notas formatadas, listas e links (https://…)'
      })
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'observacoes-rich-editor__content tiptap',
        spellcheck: 'true',
        ...(ariaLabelledBy
          ? { 'aria-labelledby': ariaLabelledBy }
          : { 'aria-label': 'Campo de observações' })
      }
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    }
  })

  useEffect(() => {
    if (!editor) return
    const incoming = value ?? ''
    const current = editor.getHTML()
    if (incoming === current) return
    const editorVazio = !editor.getText().trim()
    if (!incoming.trim() && editorVazio) return
    editor.commands.setContent(incoming, { emitUpdate: false })
  }, [value, editor])

  if (!editor) {
    return <div className="observacoes-rich-editor observacoes-rich-editor--loading" aria-hidden />
  }

  const marcarLink = () => {
    const anterior = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Endereço do link (URL)', anterior ?? 'https://')
    if (url === null) return
    const limpo = url.trim()
    if (limpo === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    let href = limpo
    if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
      href = `https://${href}`
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  return (
    <div className="observacoes-rich-editor">
      <div className="observacoes-rich-toolbar" role="toolbar" aria-label="Formatação do texto">
        <button
          type="button"
          className={editor.isActive('bold') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={editor.isActive('italic') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={editor.isActive('underline') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sublinhado"
        >
          <span className="observacoes-rich-u">U</span>
        </button>
        <button
          type="button"
          className={editor.isActive('strike') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Riscado"
        >
          <s>S</s>
        </button>
        <span className="observacoes-rich-toolbar-sep" aria-hidden />
        <button
          type="button"
          className={editor.isActive('bulletList') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista com marcadores"
        >
          • Lista
        </button>
        <button
          type="button"
          className={editor.isActive('orderedList') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          1. Lista
        </button>
        <span className="observacoes-rich-toolbar-sep" aria-hidden />
        <button
          type="button"
          className={editor.isActive('blockquote') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citação"
        >
          “ ”
        </button>
        <button
          type="button"
          className={editor.isActive('link') ? 'active' : ''}
          onClick={marcarLink}
          title="Inserir ou editar link"
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Limpar formatação do trecho ou do bloco"
        >
          Limpar
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
