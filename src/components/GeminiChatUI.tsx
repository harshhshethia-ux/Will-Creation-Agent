import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  Download,
  BookOpen,
  Lock
} from 'lucide-react';
import { WillData } from '../types/will';
import { StepKey, ChatMessage } from '../types/chat';
import { processUserResponse, INITIAL_ASSISTANT_MESSAGE } from '../services/conversationEngine';
import { SAMPLE_COMPLIANT_WILL, INITIAL_EMPTY_WILL_DATA } from '../utils/sampleData';
import { WealthCreationLogo } from './WealthCreationLogo';

interface GeminiChatUIProps {
  data: WillData;
  onUpdateData: (newData: WillData) => void;
  onOpenDocumentPreview: () => void;
  onOpenJsonModal: () => void;
  onOpenGlossary: () => void;
  onRequestDownloadPdf: () => void;
  onReset: () => void;
}

export const GeminiChatUI: React.FC<GeminiChatUIProps> = ({
  data,
  onUpdateData,
  onOpenDocumentPreview,
  onOpenJsonModal,
  onOpenGlossary,
  onRequestDownloadPdf,
  onReset,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // If testator already filled (e.g. from sample), show tailored intro or state
    if (data.testator.fullName) {
      return [
        INITIAL_ASSISTANT_MESSAGE,
        {
          id: 'msg_sample_loaded',
          sender: 'assistant',
          timestamp: Date.now(),
          text: `A sample compliant will has been loaded for **${data.testator.fullName}**. You can view the complete assembled Last Will and Testament at any time by clicking "View Draft Will" in the top bar, or continue chatting to modify any section.`,
          suggestions: ['View Legal Will Document', 'Restart with blank session'],
        },
      ];
    }
    return [INITIAL_ASSISTANT_MESSAGE];
  });

  const [currentStep, setCurrentStep] = useState<StepKey>(() => {
    return data.testator.fullName ? 'FINISHED' : 'SCOPE_Q1_RELIGION';
  });

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!text || isTyping) return;

    if (text === 'View Legal Will Document') {
      onOpenDocumentPreview();
      return;
    }
    if (text === 'Download PDF File' || text === 'Download PDF') {
      onRequestDownloadPdf();
      return;
    }
    if (text === 'Restart with blank session') {
      handleRestart();
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: Date.now(),
      text,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    // Simulate brief conversational thinking response (300-400ms)
    setTimeout(() => {
      const result = processUserResponse(text, currentStep, data);
      onUpdateData(result.updatedData);
      setCurrentStep(result.nextStep);
      setMessages(prev => [...prev, ...result.assistantMessages]);
      setIsTyping(false);
    }, 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRestart = () => {
    if (window.confirm('Restart drafting session?')) {
      onReset();
      setMessages([INITIAL_ASSISTANT_MESSAGE]);
      setCurrentStep('SCOPE_Q1_RELIGION');
      setInputVal('');
    }
  };

  const handleLoadSample = () => {
    onUpdateData(SAMPLE_COMPLIANT_WILL);
    setCurrentStep('FINISHED');
    setMessages([
      INITIAL_ASSISTANT_MESSAGE,
      {
        id: `msg_sample_${Date.now()}`,
        sender: 'assistant',
        timestamp: Date.now(),
        text: `Loaded representative compliant will draft for **${SAMPLE_COMPLIANT_WILL.testator.fullName}** (Pune, Maharashtra). All 10 sections and clauses have been compiled under the Indian Succession Act, 1925.\n\nClick **"View Draft Will"** above or below to inspect the draft with signatures and legal clauses.`,
        suggestions: ['View Legal Will Document', 'Inspect Output JSON'],
      },
    ]);
  };

  const latestAssistantMsg = messages.filter(m => m.sender === 'assistant').slice(-1)[0];
  const activeSuggestions = latestAssistantMsg?.suggestions || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 sm:px-6">
      {/* Top Advisory Strip */}
      <div className="py-2 border-b border-stone-200 text-xs text-stone-600 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <ShieldCheck className="w-4 h-4 text-stone-500 shrink-0" />
          <span className="truncate">
            Draft Will Assistant · Indian Succession Act, 1925 & Hindu Succession Act, 1956
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenGlossary}
            className="text-stone-700 hover:text-stone-900 flex items-center gap-1 font-medium transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Legal Terms</span>
          </button>
          <span>·</span>
          <button
            onClick={handleLoadSample}
            className="text-stone-700 hover:text-stone-900 transition-colors"
          >
            Load Example
          </button>
          <span>·</span>
          <button
            onClick={handleRestart}
            title="Restart conversation"
            className="text-stone-500 hover:text-stone-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
        {/* Main Page Headline Block */}
        <div className="text-center pt-1 pb-2 space-y-2 select-none border-b border-stone-200/60">
          <div className="inline-flex justify-center">
            <WealthCreationLogo size={56} />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 tracking-tight">
            Will Drafting Assistant
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
            Prepare your legal Last Will and Testament under the Indian Succession Act, 1925 & Hindu Succession Act, 1956
          </p>
        </div>

        {/* Prominent Privacy & Local Storage Notice */}
        <div className="bg-stone-50 border border-stone-200/90 rounded-xl p-3.5 sm:p-4 text-xs text-stone-700 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <h4 className="font-semibold text-stone-900 text-xs sm:text-[13px] flex items-center gap-1.5">
                  <span>Private & Confidential: Local Browser Storage</span>
                </h4>
                <span className="text-[11px] text-emerald-700 font-mono font-medium bg-emerald-100/60 px-2 py-0.5 rounded">
                  No Server Storage
                </span>
              </div>
              <p className="text-stone-600 leading-relaxed text-xs">
                All information you provide (personal particulars, family details, asset records, and ID numbers) is stored <strong>locally in your browser only</strong>. Nothing is stored on our servers. You can resume this session anytime, download your draft JSON, or wipe all records using the restart icon.
              </p>
            </div>
          </div>
        </div>

        {/* Statutory Legal Disclaimer */}
        <div className="text-center">
          <p className="inline-block text-[11px] sm:text-xs text-stone-500 bg-stone-100/80 border border-stone-200/80 px-4 py-1.5 rounded-full max-w-2xl leading-relaxed">
            This tool prepares a draft will from the information you provide. It is not legal advice. For complex family or property situations, please have a lawyer review the draft before you sign.
          </p>
        </div>

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 sm:gap-4 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* Assistant Monogram Icon */}
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center shrink-0 shadow-xs mt-0.5 p-0.5 border border-stone-800 overflow-hidden">
                <WealthCreationLogo size={24} />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-[15px] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-stone-900 text-stone-100 rounded-br-xs'
                  : msg.isError
                  ? 'bg-amber-50/90 border-2 border-amber-300/90 text-stone-900 shadow-xs rounded-bl-xs'
                  : 'bg-white border border-stone-200/80 text-stone-800 shadow-xs rounded-bl-xs'
              }`}
            >
              {/* Discrepancy header badge if validation error */}
              {msg.isError && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-md mb-2.5 w-fit border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Discrepancy · Correction Required Before Proceeding</span>
                </div>
              )}

              {/* Message text with formatting */}
              <div className="whitespace-pre-line space-y-2">
                {msg.text}
              </div>

              {/* JSON Payload preview if present */}
              {msg.jsonPayload && (
                <div className="mt-4 pt-3 border-t border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-stone-600">
                      STEP 1: Validated JSON Object
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(msg.jsonPayload, null, 2));
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1"
                    >
                      {copiedJson ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="bg-stone-950 text-stone-200 p-3 rounded text-[11px] font-mono overflow-x-auto max-h-48 leading-tight">
                    {JSON.stringify(msg.jsonPayload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Final action buttons if finished */}
              {msg.stepKey === 'FINISHED' && (
                <div className="mt-4 pt-3 border-t border-stone-200 flex flex-wrap gap-2">
                  <button
                    onClick={onRequestDownloadPdf}
                    className="px-4 py-2 bg-amber-200 hover:bg-amber-100 text-stone-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF File</span>
                  </button>
                  <button
                    onClick={onOpenDocumentPreview}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View & Print Draft</span>
                  </button>
                  <button
                    onClick={onOpenJsonModal}
                    className="px-3.5 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    Inspect JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 sm:gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center shrink-0 shadow-xs p-0.5 border border-stone-800 overflow-hidden">
              <WealthCreationLogo size={24} />
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 text-stone-400 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-pulse delay-100"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-pulse delay-200"></span>
              <span className="ml-1 text-stone-500 font-mono">Formulating next step...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area (Gemini Style) */}
      <div className="pb-4 pt-2 shrink-0">
        {/* Suggestion Chips */}
        {activeSuggestions.length > 0 && !isTyping && currentStep !== 'STOPPED' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-1">
            {activeSuggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug)}
                className="text-xs px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-full text-stone-700 whitespace-nowrap transition-colors shadow-2xs hover:border-stone-400 shrink-0"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Floating Input Pill */}
        <div className="relative bg-white border border-stone-300 rounded-2xl shadow-sm focus-within:border-stone-500 focus-within:ring-2 focus-within:ring-stone-200 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            disabled={currentStep === 'STOPPED'}
            placeholder={
              currentStep === 'STOPPED'
                ? 'Session stopped as per legal succession rules.'
                : 'Type your answer here or select a quick option above...'
            }
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-4 pr-12 py-3.5 text-sm text-stone-900 bg-transparent resize-none focus:outline-hidden disabled:opacity-50"
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputVal.trim() || isTyping || currentStep === 'STOPPED'}
            className="absolute right-2.5 top-2.5 w-8 h-8 rounded-full bg-stone-900 disabled:bg-stone-200 text-white disabled:text-stone-400 flex items-center justify-center transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-500 px-2 pt-1.5">
          <span>Press Enter to send · Shift+Enter for new line</span>
          <span>Approved Clause Library · Indian Succession Act, 1925</span>
        </div>
      </div>
    </div>
  );
};
