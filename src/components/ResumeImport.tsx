import { FileUp, LoaderCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { ACCEPTED_RESUME_FILES, ResumeImportError, readResumeFile } from '../utils/fileImport';
import { buttonStyles } from './buttonStyles';
import { useToast } from './Toast';

/**
 * Lê o arquivo do currículo e preenche o campo. Se já havia texto, ele é substituído sem perguntar,
 * e o aviso de sucesso oferece "Desfazer" para recuperá-lo.
 */
export function useResumeImport(currentText: string, onImported: (text: string) => void) {
  const showToast = useToast();
  const [importing, setImporting] = useState(false);

  const importFile = async (file: File) => {
    if (importing) return;
    const previousText = currentText;

    setImporting(true);
    try {
      const text = await readResumeFile(file);
      onImported(text);
      showToast(
        `Currículo importado de "${file.name}". Confira o texto antes de analisar.`,
        'success',
        previousText.trim() ? { label: 'Desfazer', onClick: () => onImported(previousText) } : undefined,
      );
    } catch (error) {
      showToast(
        error instanceof ResumeImportError ? error.message : 'Não foi possível ler o arquivo. Tente salvá-lo em outro formato.',
        'error',
      );
    } finally {
      setImporting(false);
    }
  };

  return { importing, importFile };
}

interface ResumeImportButtonProps {
  importing: boolean;
  onFile: (file: File) => void;
}

export function ResumeImportButton({ importing, onFile }: ResumeImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        aria-busy={importing}
        title="PDF, DOCX ou TXT. O arquivo é lido no seu navegador e não é enviado a lugar nenhum."
        aria-label={importing ? 'Lendo arquivo' : 'Importar currículo de um arquivo PDF, DOCX ou TXT'}
        className={`${buttonStyles.secondary} shadow-sm`}
      >
        {importing ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileUp className="size-4" aria-hidden="true" />
        )}
        {importing ? 'Lendo arquivo…' : 'Importar'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_RESUME_FILES}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Limpa a seleção para permitir importar o mesmo arquivo de novo.
          event.target.value = '';
          if (file) onFile(file);
        }}
      />
    </>
  );
}
