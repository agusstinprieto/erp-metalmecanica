import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download, FileText } from 'lucide-react';
import clsx from 'clsx';
import { useConfig } from '../contexts/ConfigContext';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedRow {
  first_name: string;
  last_name: string;
  employee_number: string;
  email: string;
  phone: string;
  job_title: string;
  department: string;
  daily_salary: number;
  rfc: string;
  curp: string;
  nss: string;
  bank_account: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'vacation' | 'medical_leave';
}

export const ImportEmployeesModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const { isDarkMode } = useConfig();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const requiredFields = ['first_name', 'nombre', 'firstname', 'last_name', 'apellido', 'lastname', 'employee_number', 'num_empleado', 'numero'];
    
    const results: ParsedRow[] = [];
    const newErrors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length < 3) continue;
      
      const row: any = {};
      headers.forEach((h, idx) => {
        if (values[idx] !== undefined) {
          row[h] = values[idx];
        }
      });
      
      const firstName = row.first_name || row.nombre || row.firstname || '';
      const lastName = row.last_name || row.apellido || row.lastname || '';
      const employeeNumber = row.employee_number || row.num_empleado || row.numero || `EMP${i.toString().padStart(4, '0')}`;
      
      if (!firstName && !lastName) {
        newErrors.push(`Fila ${i + 1}: Falta nombre`);
        continue;
      }
      
      results.push({
        first_name: firstName,
        last_name: lastName,
        employee_number: employeeNumber,
        email: row.email || row.correo || '',
        phone: row.phone || row.telefono || row.phone_number || '',
        job_title: row.job_title || row.position || row.cargo || row.puesto || '',
        department: row.department || row.departamento || row.depto || '',
        daily_salary: parseFloat(row.daily_salary || row.daily_salary || row.salario_diario || row.salario || '0') || 0,
        rfc: row.rfc || '',
        curp: row.curp || '',
        nss: row.nss || row.seguro_social || '',
        bank_account: row.bank_account || row.cuenta_bancaria || row.clabe || '',
        hire_date: row.hire_date || row.fecha_ingreso || row.fecha_alta || '',
        status: (row.status || row.estado || 'active') as any
      });
    }
    
    setErrors(newErrors);
    return results;
  };

  const parseExcel = (data: any): ParsedRow[] => {
    try {
      const rows = data.split('\n').filter((l: string) => l.trim());
      if (rows.length < 2) return [];
      
      const results: ParsedRow[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split('\t');
        if (values.length < 2) continue;
        
        results.push({
          first_name: values[0] || '',
          last_name: values[1] || '',
          employee_number: values[2] || `EMP${i.toString().padStart(4, '0')}`,
          email: values[3] || '',
          phone: values[4] || '',
          job_title: values[5] || '',
          department: values[6] || '',
          daily_salary: parseFloat(values[7] || '0') || 0,
          rfc: values[8] || '',
          curp: values[9] || '',
          nss: values[10] || '',
          bank_account: values[11] || '',
          hire_date: values[12] || '',
          status: 'active'
        });
      }
      
      return results.filter(r => r.first_name || r.last_name);
    } catch {
      return [];
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setErrors([]);
    
    const text = await selectedFile.text();
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    let data: ParsedRow[] = [];
    
    if (extension === 'csv' || extension === 'txt') {
      data = parseCSV(text);
    } else if (extension === 'xlsx' || extension === 'xls') {
      data = parseExcel(text);
    }
    
    if (data.length > 0) {
      setParsedData(data);
      setStep('preview');
    } else {
      setErrors(['No se pudieron leer datos del archivo. Verifica el formato.']);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    
    let success = 0;
    let failed = 0;
    
    try {
      // Import sequentially to avoid rate limits or overwhelming the server
      for (const emp of parsedData) {
        try {
          await employeeService.createEmployee(emp);
          success++;
        } catch (err) {
          console.error(`Error importing employee ${emp.first_name}:`, err);
          failed++;
        }
      }
      
      setImportResult({ success, failed });
      setStep('result');
      
      if (success > 0) {
        onImportComplete();
      }
    } catch (err) {
      console.error('Critical error during import:', err);
      setErrors(['Error crítico durante la importación. Revisa la consola.']);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `first_name,last_name,employee_number,email,phone,job_title,department,daily_salary,rfc,curp,nss,bank_account,hire_date,status
Juan,Pérez Garcia,EMP0001,juan.perez@empresa.com,5551234567,Operador de Producción,PRODUCCIÓN,450.00,XEXX010101XXX,CURP123456789012AB,12345678901,012345678901234567,2024-01-15,active
María,González López,EMP0002,maria.gonzalez@empresa.com,5559876543,Supervisora de Calidad,QUALITY,550.00,XEXX010101YYY,CURP987654321098CD,98765432109,987654321098765432,2023-06-01,active`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_empleados_mcvill.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setStep('upload');
    setImportResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 top-16 left-64 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={clsx(
              "w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden",
              isDarkMode ? "bg-slate-950 border-mcvill-card-border" : "bg-white border-mcvill-card-border"
            )}
          >
            <div className={clsx(
              "p-6 flex items-center justify-between border-b",
              isDarkMode ? "border-mcvill-card-border" : "border-mcvill-card-border"
            )}>
              <div className="flex items-center gap-4">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  isDarkMode ? "bg-mcvill-accent/10 border border-mcvill-card-border" : "bg-blue-100"
                )}>
                  <Upload className={clsx(isDarkMode ? "text-blue-400" : "text-blue-600")} size={24} />
                </div>
                <div>
                  <h2 className={clsx(
                    "text-xl font-black uppercase tracking-tight",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}>
                    IMPORTAR EMPLEADOS
                  </h2>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Carga masiva desde CSV, TXT o Excel
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className={clsx(
                  "p-3 rounded-2xl transition-all",
                  isDarkMode ? "hover:bg-white/10 text-slate-500" : "hover:bg-slate-100 text-slate-400"
                )}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {step === 'upload' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={downloadTemplate}
                      className={clsx(
                        "p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-3",
                        isDarkMode 
                          ? "border-mcvill-card-border hover:border-blue-500/40 bg-white/5" 
                          : "border-blue-200 hover:border-blue-400 bg-blue-50"
                      )}
                    >
                      <Download size={32} className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                      <div className="text-center">
                        <p className={clsx(
                          "font-bold text-sm",
                          isDarkMode ? "text-white" : "text-slate-900"
                        )}>Descargar Plantilla</p>
                        <p className="text-[10px] text-slate-500">Archivo CSV listo para editar</p>
                      </div>
                    </button>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv,.txt,.xlsx,.xls"
                      className="hidden"
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={clsx(
                        "p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-3",
                        isDarkMode 
                          ? "border-mcvill-card-border hover:border-emerald-500/40 bg-white/5" 
                          : "border-emerald-200 hover:border-emerald-400 bg-emerald-50"
                      )}
                    >
                      <FileSpreadsheet size={32} className={isDarkMode ? "text-emerald-400" : "text-emerald-600"} />
                      <div className="text-center">
                        <p className={clsx(
                          "font-bold text-sm",
                          isDarkMode ? "text-white" : "text-slate-900"
                        )}>Subir Archivo</p>
                        <p className="text-[10px] text-slate-500">CSV, TXT o Excel</p>
                      </div>
                    </button>
                  </div>

                  <div className={clsx(
                    "p-6 rounded-2xl",
                    isDarkMode ? "bg-slate-900/50 border border-mcvill-card-border" : "bg-slate-50 border border-mcvill-card-border"
                  )}>
                    <h3 className={clsx(
                      "font-bold text-sm mb-3 uppercase tracking-wider",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}>Formato Esperado</h3>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                      {['first_name', 'last_name', 'employee_number', 'email', 'phone', 'job_title', 'department', 'daily_salary', 'rfc', 'curp', 'nss', 'bank_account', 'hire_date', 'status'].map((field) => (
                        <div key={field} className={clsx(
                          "px-3 py-2 rounded-2xl",
                          isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-600"
                        )}>
                          {field}
                        </div>
                      ))}
                    </div>
                  </div>

                  {errors.length > 0 && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase mb-2">
                        <AlertCircle size={14} />
                        Errores detectados
                      </div>
                      {errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-[10px] text-red-400 font-mono">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 'preview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-emerald-500" />
                      <div>
                        <p className="font-bold text-sm text-white">{file?.name}</p>
                        <p className="text-[10px] text-slate-500">{parsedData.length} registros encontrados</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep('upload')}
                      className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-400 text-[10px] font-bold uppercase"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className={clsx(
                    "rounded-2xl overflow-hidden border",
                    isDarkMode ? "border-mcvill-card-border" : "border-mcvill-card-border"
                  )}>
                    <div className={clsx(
                      "p-3 text-[9px] font-black uppercase tracking-widest",
                      isDarkMode ? "bg-slate-900 text-slate-500" : "bg-slate-100 text-slate-500"
                    )}>
                      Vista Previa de Importación
                    </div>
                    <div className="max-h-80 overflow-auto custom-scrollbar">
                      <table className="w-full text-left text-[10px]">
                        <thead className={clsx(
                          isDarkMode ? "bg-slate-900/50" : "bg-slate-50"
                        )}>
                          <tr className="font-black uppercase tracking-wider">
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Nombre</th>
                            <th className="px-3 py-2">No. Empleado</th>
                            <th className="px-3 py-2">Departamento</th>
                            <th className="px-3 py-2">Salario Diario</th>
                            <th className="px-3 py-2">RFC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsedData.slice(0, 20).map((row, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                              <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                              <td className="px-3 py-2 font-bold text-white">{row.first_name} {row.last_name}</td>
                              <td className="px-3 py-2 font-mono text-slate-400">{row.employee_number}</td>
                              <td className="px-3 py-2">{row.department || '-'}</td>
                              <td className="px-3 py-2 text-emerald-400">${row.daily_salary.toLocaleString()}</td>
                              <td className="px-3 py-2 font-mono text-slate-400">{row.rfc || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedData.length > 20 && (
                        <div className="p-3 text-center text-[10px] text-slate-500">
                          ... y {parsedData.length - 20} más
                        </div>
                      )}
                    </div>
                  </div>

                  {errors.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-400 text-xs font-bold">{errors.length} advertencias (se importarán omitiendo filas con errores)</p>
                    </div>
                  )}
                </div>
              )}

              {step === 'result' && importResult && (
                <div className="text-center py-12 space-y-6">
                  <div className={clsx(
                    "w-24 h-24 rounded-2xl mx-auto flex items-center justify-center",
                    importResult.failed === 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"
                  )}>
                    {importResult.failed === 0 ? (
                      <CheckCircle2 size={48} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={48} className="text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                      {importResult.failed === 0 ? 'Importación Exitosa' : 'Importación Completada'}
                    </h3>
                    <p className="text-slate-500 text-sm mt-2">
                      {importResult.success} importados • {importResult.failed} fallidos
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className={clsx(
              "p-6 border-t flex justify-end gap-4",
              isDarkMode ? "border-mcvill-card-border" : "border-mcvill-card-border"
            )}>
              {step === 'upload' && (
                <button
                  onClick={handleClose}
                  className={clsx(
                    "px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all",
                    isDarkMode 
                      ? "bg-slate-800 text-slate-400 hover:text-white" 
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  )}
                >
                  Cancelar
                </button>
              )}
              
              {step === 'preview' && (
                <>
                  <button
                    onClick={() => setStep('upload')}
                    className={clsx(
                      "px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all",
                      isDarkMode 
                        ? "bg-slate-800 text-slate-400 hover:text-white" 
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="px-8 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    {importing ? <Loader2 size={16} className="animate-spin" /> : null}
                    {importing ? 'Importando...' : `Importar ${parsedData.length} Empleados`}
                  </button>
                </>
              )}

              {step === 'result' && (
                <button
                  onClick={handleClose}
                  className="px-8 py-3 rounded-2xl bg-blue-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
                >
                  Cerrar
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImportEmployeesModal;
