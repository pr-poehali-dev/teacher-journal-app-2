import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────────────────────────

type AttendanceStatus = "" | "Б" | "Н" | "У";
type Grade = "" | "5" | "4" | "3" | "2";
type LessonType = "Лекция" | "Практика" | "Контрольная";

interface Lesson {
  id: string;
  date: string;
  type: LessonType;
  topic: string;
  homework: string;
}

interface StudentRecord {
  [lessonId: string]: {
    attendance: AttendanceStatus;
    grade: Grade;
  };
}

interface Student {
  id: string;
  name: string;
  records: StudentRecord;
}

interface Group {
  id: string;
  name: string;
  students: Student[];
  lessons: Lesson[];
}

interface JournalData {
  groups: Group[];
  activeGroupId: string;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const makeId = () => Math.random().toString(36).slice(2, 9);

const formatDate = (d: Date) =>
  d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });

const DEMO_LESSONS: Lesson[] = [
  { id: "l1", date: "03.06.26", type: "Лекция", topic: "Введение в предмет", homework: "Прочитать главу 1" },
  { id: "l2", date: "05.06.26", type: "Практика", topic: "Практическая работа №1", homework: "" },
  { id: "l3", date: "10.06.26", type: "Контрольная", topic: "Контрольная работа", homework: "" },
];

const DEMO_STUDENTS: Student[] = [
  {
    id: "s1", name: "Авдеев Максим Игоревич",
    records: { l1: { attendance: "Б", grade: "5" }, l2: { attendance: "Б", grade: "4" }, l3: { attendance: "Б", grade: "5" } }
  },
  {
    id: "s2", name: "Борисова Анна Сергеевна",
    records: { l1: { attendance: "Б", grade: "4" }, l2: { attendance: "Н", grade: "" }, l3: { attendance: "Б", grade: "3" } }
  },
  {
    id: "s3", name: "Васильев Дмитрий Олегович",
    records: { l1: { attendance: "У", grade: "" }, l2: { attendance: "Б", grade: "5" }, l3: { attendance: "Б", grade: "5" } }
  },
  {
    id: "s4", name: "Гаврилова Елена Николаевна",
    records: { l1: { attendance: "Н", grade: "" }, l2: { attendance: "Н", grade: "" }, l3: { attendance: "Н", grade: "2" } }
  },
  {
    id: "s5", name: "Данилов Артём Вячеславович",
    records: { l1: { attendance: "Б", grade: "3" }, l2: { attendance: "Б", grade: "4" }, l3: { attendance: "Б", grade: "4" } }
  },
  {
    id: "s6", name: "Ершова Виктория Андреевна",
    records: { l1: { attendance: "Б", grade: "5" }, l2: { attendance: "Б", grade: "5" }, l3: { attendance: "У", grade: "" } }
  },
];

const INITIAL_DATA: JournalData = {
  activeGroupId: "g1",
  groups: [
    { id: "g1", name: "ИП-21", students: DEMO_STUDENTS, lessons: DEMO_LESSONS },
    { id: "g2", name: "ЭК-22", students: [], lessons: [] },
  ],
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function calcAvgGrade(student: Student): number {
  const grades = Object.values(student.records)
    .map(r => parseInt(r.grade))
    .filter(g => !isNaN(g));
  if (grades.length === 0) return 0;
  return grades.reduce((a, b) => a + b, 0) / grades.length;
}

function calcAbsences(student: Student): number {
  return Object.values(student.records).filter(r => r.attendance === "Н").length;
}

function calcSessionStatus(student: Student): "Автомат" | "Экзамен" | "Недопуск" {
  const avg = calcAvgGrade(student);
  const absences = calcAbsences(student);
  if (avg === 0 && absences === 0) return "Экзамен";
  if (avg < 2.5 || absences >= 5) return "Недопуск";
  if (avg >= 4.5 && absences === 0) return "Автомат";
  return "Экзамен";
}

function generateCharacteristic(student: Student, groupName: string): string {
  const avg = calcAvgGrade(student);
  const absences = calcAbsences(student);
  const status = calcSessionStatus(student);
  const totalLessons = Object.keys(student.records).length;
  const present = Object.values(student.records).filter(r => r.attendance === "Б").length;
  const attendance = totalLessons > 0 ? Math.round((present / totalLessons) * 100) : 0;
  const parts = student.name.split(" ");
  const lastName = parts[0] || "";
  const firstName = parts[1] || "";
  const nameGen = student.name;

  let perfText = "";
  if (avg >= 4.5) perfText = "демонстрирует отличные результаты в учёбе, стабильно получает оценки «отлично»";
  else if (avg >= 3.8) perfText = "показывает хорошую успеваемость, преимущественно получает оценки «хорошо» и «отлично»";
  else if (avg >= 3.0) perfText = "имеет удовлетворительную успеваемость, средний балл соответствует оценке «удовлетворительно»";
  else perfText = "испытывает серьёзные затруднения в освоении учебного материала";

  let attText = "";
  if (absences === 0) attText = "регулярно посещает все занятия, пропусков не имеет";
  else if (absences <= 2) attText = `в целом посещает занятия регулярно (${absences} пропуска без уважительной причины)`;
  else if (absences <= 4) attText = `допускает пропуски занятий (${absences} раза без уважительной причины), что требует внимания`;
  else attText = `систематически пропускает занятия (${absences} раз без уважительной причины), что негативно сказывается на успеваемости`;

  let concl = "";
  if (status === "Автомат") concl = `По итогам семестра ${firstName} рекомендован(а) к получению зачёта/экзамена в форме «автомат».`;
  else if (status === "Недопуск") concl = `В связи с низкой успеваемостью и/или систематическими пропусками ${firstName} не рекомендован(а) к допуску к сессии без дополнительной работы с куратором.`;
  else concl = `${firstName} допускается к сессии в установленном порядке.`;

  void lastName;

  return `ХАРАКТЕРИСТИКА

Студент(ка) группы ${groupName}: ${nameGen}

${nameGen} ${perfText}. Средний балл за текущий период составляет ${avg > 0 ? avg.toFixed(1) : "н/д"}.

По посещаемости: ${lastName} ${attText}. Общая посещаемость — ${attendance}%.

${concl}

Характеристика составлена на основании данных электронного журнала.
Дата: ${new Date().toLocaleDateString("ru-RU")}`;
}

// ─── Modal: Lesson Topic ──────────────────────────────────────────────────────

function LessonModal({ lesson, onSave, onClose }: {
  lesson: Lesson;
  onSave: (topic: string, hw: string) => void;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState(lesson.topic);
  const [hw, setHw] = useState(lesson.homework);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 glass rounded-2xl p-6 w-full max-w-md card-shadow animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl grad-primary flex items-center justify-center">
            <Icon name="BookOpen" size={18} className="text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-foreground">{lesson.type}</div>
            <div className="text-sm text-muted-foreground">{lesson.date}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Тема занятия</label>
            <input
              className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Введите тему..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Домашнее задание</label>
            <textarea
              className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              rows={3}
              value={hw}
              onChange={e => setHw(e.target.value)}
              placeholder="Домашнее задание..."
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-primary flex-1" onClick={() => { onSave(topic, hw); onClose(); }}>
            Сохранить
          </button>
          <button className="btn-ghost" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Student Card ──────────────────────────────────────────────────────

function StudentCard({ student, group, onClose }: {
  student: Student;
  group: Group;
  onClose: () => void;
}) {
  const [showChar, setShowChar] = useState(false);
  const avg = calcAvgGrade(student);
  const absences = calcAbsences(student);
  const excuses = Object.values(student.records).filter(r => r.attendance === "У").length;
  const present = Object.values(student.records).filter(r => r.attendance === "Б").length;
  const status = calcSessionStatus(student);
  const char = generateCharacteristic(student, group.name);

  const statusClass = status === "Автомат" ? "status-auto" : status === "Недопуск" ? "status-fail" : "status-exam";

  const grades = Object.entries(student.records)
    .filter(([, r]) => r.grade !== "")
    .map(([lessonId, r]) => {
      const lesson = group.lessons.find(l => l.id === lessonId);
      return { date: lesson?.date ?? "", type: lesson?.type ?? "", grade: r.grade };
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 glass rounded-2xl w-full max-w-lg card-shadow animate-scale-in overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="grad-header p-6 text-white relative">
          <button
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={onClose}
          >
            <Icon name="X" size={16} className="text-white" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-display font-bold text-white">
              {student.name[0]}
            </div>
            <div>
              <div className="font-display font-bold text-xl leading-tight">{student.name}</div>
              <div className="text-purple-200 text-sm mt-1">Группа {group.name}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusClass}`}>{status}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Средний балл", value: avg > 0 ? avg.toFixed(1) : "—", color: avg >= 4.5 ? "#10b981" : avg >= 3.5 ? "#3b82f6" : avg >= 2.5 ? "#f59e0b" : "#ef4444" },
              { label: "Присутствовал", value: String(present), color: "#10b981" },
              { label: "Прогулов (Н)", value: String(absences), color: absences >= 5 ? "#ef4444" : absences >= 3 ? "#f97316" : "#64748b" },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-white/80 border border-border p-3 text-center">
                <div className="text-2xl font-display font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {grades.length > 0 && (
            <div className="mb-5">
              <div className="text-sm font-semibold text-foreground mb-2">Оценки</div>
              <div className="flex flex-wrap gap-2">
                {grades.map((g, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white/80 rounded-lg px-2.5 py-1 border border-border text-sm">
                    <span className="font-bold" style={{
                      color: g.grade === "5" ? "#10b981" : g.grade === "4" ? "#3b82f6" : g.grade === "3" ? "#f59e0b" : "#ef4444"
                    }}>{g.grade}</span>
                    <span className="text-muted-foreground">{g.type} {g.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {excuses > 0 && (
            <div className="text-sm text-blue-600 bg-blue-50 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
              <Icon name="Info" size={14} />
              Пропусков по уважительной причине: {excuses}
            </div>
          )}

          <button
            className="btn-amber w-full mb-3"
            onClick={() => setShowChar(!showChar)}
          >
            <Icon name="FileText" size={16} className="inline mr-2" />
            {showChar ? "Скрыть характеристику" : "Сгенерировать характеристику"}
          </button>

          {showChar && (
            <div className="animate-fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs whitespace-pre-line text-slate-700 leading-relaxed font-mono">
                {char}
              </div>
              <button
                className="mt-2 btn-ghost w-full text-sm"
                onClick={() => navigator.clipboard.writeText(char)}
              >
                <Icon name="Copy" size={14} className="inline mr-1" />
                Копировать текст
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Group Analytics ───────────────────────────────────────────────────

function AnalyticsModal({ group, onClose }: { group: Group; onClose: () => void }) {
  if (group.students.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative z-10 glass rounded-2xl p-8 card-shadow animate-scale-in text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="font-bold text-foreground">В группе нет студентов</div>
          <button className="btn-ghost mt-4" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    );
  }

  const students = group.students;
  const allAvgs = students.map(s => ({ s, avg: calcAvgGrade(s), abs: calcAbsences(s) }));
  const withGrades = allAvgs.filter(x => x.avg > 0);
  const groupAvg = withGrades.length > 0 ? withGrades.reduce((sum, x) => sum + x.avg, 0) / withGrades.length : 0;

  const totalAttendance = students.reduce((sum, s) => {
    const total = Object.values(s.records).length;
    const present = Object.values(s.records).filter(r => r.attendance === "Б").length;
    return sum + (total > 0 ? present / total : 0);
  }, 0) / students.length;

  const sortedDesc = [...allAvgs].sort((a, b) => b.avg - a.avg || a.abs - b.abs);
  const top3 = sortedDesc.slice(0, 3).filter(x => x.avg > 0);
  const sortedAsc = [...allAvgs].sort((a, b) => a.avg - b.avg || b.abs - a.abs);
  const bottom3 = sortedAsc.slice(0, 3).filter(x => x.avg > 0 || x.abs > 0);

  const autoCount = students.filter(s => calcSessionStatus(s) === "Автомат").length;
  const failCount = students.filter(s => calcSessionStatus(s) === "Недопуск").length;
  const examCount = students.filter(s => calcSessionStatus(s) === "Экзамен").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 glass rounded-2xl w-full max-w-lg card-shadow animate-scale-in overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="grad-header p-6 text-white relative">
          <button
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={onClose}
          >
            <Icon name="X" size={16} className="text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">📈</div>
            <div>
              <div className="font-display font-bold text-xl">Аналитика группы</div>
              <div className="text-purple-200 text-sm">{group.name} · {students.length} студентов</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-4 text-center">
              <div className="text-3xl font-display font-bold text-purple-700">{groupAvg > 0 ? groupAvg.toFixed(1) : "—"}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Средний балл группы</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4 text-center">
              <div className="text-3xl font-display font-bold text-green-700">{Math.round(totalAttendance * 100)}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Общая посещаемость</div>
            </div>
          </div>

          <div className="rounded-xl bg-white/80 border border-border p-4">
            <div className="text-sm font-semibold text-foreground mb-3">Статус сессии</div>
            <div className="flex gap-2 flex-wrap">
              <span className="status-auto px-3 py-1 rounded-full text-sm font-semibold">Автомат: {autoCount}</span>
              <span className="status-exam px-3 py-1 rounded-full text-sm font-semibold">Экзамен: {examCount}</span>
              <span className="status-fail px-3 py-1 rounded-full text-sm font-semibold">Недопуск: {failCount}</span>
            </div>
          </div>

          {top3.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🏆</span>
                <div className="text-sm font-semibold text-foreground">ТОП-3 лучших студентов</div>
              </div>
              <div className="space-y-2">
                {top3.map((item, i) => (
                  <div key={item.s.id} className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-3 py-2">
                    <span className="text-green-600 font-display font-bold w-5">{i + 1}</span>
                    <span className="flex-1 text-sm text-foreground">{item.s.name}</span>
                    <span className="text-sm font-bold text-green-600">{item.avg.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bottom3.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚠️</span>
                <div className="text-sm font-semibold text-foreground">Зона риска</div>
              </div>
              <div className="space-y-2">
                {bottom3.map(item => (
                  <div key={item.s.id} className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                    <Icon name="AlertTriangle" size={14} className="text-red-400 shrink-0" />
                    <span className="flex-1 text-sm text-foreground">{item.s.name}</span>
                    <span className="text-xs text-red-400">
                      {item.avg > 0 ? `ср. ${item.avg.toFixed(1)}` : ""}{item.abs > 0 ? ` · ${item.abs} пр.` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Add Student ───────────────────────────────────────────────────────

function AddStudentModal({ onAdd, onClose }: { onAdd: (names: string[]) => void; onClose: () => void }) {
  const [mode, setMode] = useState<"single" | "import">("single");
  const [name, setName] = useState("");
  const [bulk, setBulk] = useState("");

  const handleAdd = () => {
    if (mode === "single") {
      if (name.trim()) { onAdd([name.trim()]); onClose(); }
    } else {
      const names = bulk.split("\n").map(n => n.trim()).filter(Boolean);
      if (names.length) { onAdd(names); onClose(); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 glass rounded-2xl p-6 w-full max-w-md card-shadow animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl grad-primary flex items-center justify-center">
            <Icon name="UserPlus" size={18} className="text-white" />
          </div>
          <div className="font-display font-bold text-foreground text-lg">Добавить студентов</div>
        </div>

        <div className="flex rounded-xl bg-muted p-1 mb-4">
          {(["single", "import"] as const).map(m => (
            <button
              key={m}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === m ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode(m)}
            >
              {m === "single" ? "Один студент" : "Импорт списка"}
            </button>
          ))}
        </div>

        {mode === "single" ? (
          <input
            className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 mb-4"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Фамилия Имя Отчество"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            autoFocus
          />
        ) : (
          <div className="mb-4">
            <textarea
              className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              rows={6}
              value={bulk}
              onChange={e => setBulk(e.target.value)}
              placeholder={"Иванов Иван Иванович\nПетрова Анна Сергеевна\nСидоров Олег Юрьевич"}
            />
            <div className="text-xs text-muted-foreground mt-1">Каждое имя с новой строки</div>
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={handleAdd}>Добавить</button>
          <button className="btn-ghost" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Add Group ─────────────────────────────────────────────────────────

function AddGroupModal({ onAdd, onClose }: { onAdd: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 glass rounded-2xl p-6 w-full max-w-sm card-shadow animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="font-display font-bold text-foreground text-lg mb-4">Новая группа</div>
        <input
          className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 mb-4"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Например: ИТ-23"
          onKeyDown={e => {
            if (e.key === "Enter" && name.trim()) { onAdd(name.trim()); onClose(); }
          }}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            className="btn-primary flex-1"
            onClick={() => { if (name.trim()) { onAdd(name.trim()); onClose(); } }}
          >
            Создать
          </button>
          <button className="btn-ghost" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Index() {
  const [data, setData] = useState<JournalData>(() => {
    try {
      const saved = localStorage.getItem("teacher-journal-v2");
      if (saved) return JSON.parse(saved) as JournalData;
    } catch { /* ignore */ }
    return INITIAL_DATA;
  });

  const [modal, setModal] = useState<
    | { type: "lesson"; lessonId: string }
    | { type: "student"; studentId: string }
    | { type: "analytics" }
    | { type: "addStudent" }
    | { type: "addGroup" }
    | null
  >(null);

  const [lessonDropdownOpen, setLessonDropdownOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("teacher-journal-v2", JSON.stringify(data));
  }, [data]);

  const activeGroup = data.groups.find(g => g.id === data.activeGroupId)!;

  const updateGroup = useCallback((updater: (g: Group) => Group) => {
    setData(d => ({
      ...d,
      groups: d.groups.map(g => g.id === d.activeGroupId ? updater(g) : g),
    }));
  }, []);

  const cycleAttendance = (studentId: string, lessonId: string) => {
    const cycle: AttendanceStatus[] = ["", "Б", "Н", "У"];
    updateGroup(g => ({
      ...g,
      students: g.students.map(s => {
        if (s.id !== studentId) return s;
        const cur = s.records[lessonId]?.attendance ?? "";
        const idx = cycle.indexOf(cur);
        const next = cycle[(idx + 1) % cycle.length];
        return {
          ...s,
          records: {
            ...s.records,
            [lessonId]: { ...s.records[lessonId], attendance: next, grade: s.records[lessonId]?.grade ?? "" },
          },
        };
      }),
    }));
  };

  const setGrade = (studentId: string, lessonId: string, grade: Grade) => {
    updateGroup(g => ({
      ...g,
      students: g.students.map(s => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          records: {
            ...s.records,
            [lessonId]: { attendance: s.records[lessonId]?.attendance ?? "", grade },
          },
        };
      }),
    }));
  };

  const addLesson = (type: LessonType) => {
    const id = makeId();
    const date = formatDate(new Date());
    updateGroup(g => ({
      ...g,
      lessons: [...g.lessons, { id, date, type, topic: "", homework: "" }],
    }));
  };

  const markAllPresent = () => {
    updateGroup(g => {
      if (g.lessons.length === 0) return g;
      const lastLesson = g.lessons[g.lessons.length - 1];
      return {
        ...g,
        students: g.students.map(s => ({
          ...s,
          records: {
            ...s.records,
            [lastLesson.id]: {
              attendance: "Б" as AttendanceStatus,
              grade: s.records[lastLesson.id]?.grade ?? "" as Grade,
            },
          },
        })),
      };
    });
  };

  const callToBoard = () => {
    if (activeGroup.students.length === 0) return;
    const lastLesson = activeGroup.lessons.length > 0
      ? activeGroup.lessons[activeGroup.lessons.length - 1]
      : null;

    const eligible = activeGroup.students.filter(s => {
      if (!lastLesson) return true;
      const rec = s.records[lastLesson.id];
      return !rec || rec.attendance === "Б" || rec.attendance === "";
    });

    if (eligible.length === 0) return;

    const withWeights = eligible.map(s => ({
      s,
      weight: 1 / (Object.values(s.records).filter(r => r.grade !== "").length + 1),
    }));
    const total = withWeights.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * total;
    let chosen = withWeights[0].s;
    for (const w of withWeights) {
      rand -= w.weight;
      if (rand <= 0) { chosen = w.s; break; }
    }

    setModal({ type: "student", studentId: chosen.id });
  };

  const exportCSV = () => {
    const g = activeGroup;
    const header = [
      "Студент", "Статус", "Средний балл", "Прогулы",
      ...g.lessons.map(l => `${l.date} ${l.type} (посещ.)`),
      ...g.lessons.map(l => `${l.date} ${l.type} (оценка)`),
    ];
    const rows = g.students.map(s => [
      s.name,
      calcSessionStatus(s),
      calcAvgGrade(s).toFixed(1),
      String(calcAbsences(s)),
      ...g.lessons.map(l => s.records[l.id]?.attendance ?? ""),
      ...g.lessons.map(l => s.records[l.id]?.grade ?? ""),
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(";")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Журнал_${g.name}_${formatDate(new Date()).replace(/\./g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateLesson = (lessonId: string, topic: string, hw: string) => {
    updateGroup(g => ({
      ...g,
      lessons: g.lessons.map(l => l.id === lessonId ? { ...l, topic, homework: hw } : l),
    }));
  };

  const addStudents = (names: string[]) => {
    updateGroup(g => ({
      ...g,
      students: [...g.students, ...names.map(name => ({ id: makeId(), name, records: {} }))],
    }));
  };

  const addGroup = (name: string) => {
    const id = makeId();
    setData(d => ({
      ...d,
      groups: [...d.groups, { id, name, students: [], lessons: [] }],
      activeGroupId: id,
    }));
  };

  const attendanceStyle = (status: AttendanceStatus) => {
    if (status === "Б") return "attendance-present";
    if (status === "Н") return "attendance-absent";
    if (status === "У") return "attendance-excuse";
    return "attendance-empty";
  };

  const openLesson = modal?.type === "lesson"
    ? activeGroup.lessons.find(l => l.id === modal.lessonId)
    : null;
  const openStudent = modal?.type === "student"
    ? activeGroup.students.find(s => s.id === modal.studentId)
    : null;

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="grad-header text-white sticky top-0 z-30" style={{ boxShadow: "var(--shadow-header)" }}>
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mr-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">📚</div>
              <div className="hidden sm:block">
                <div className="font-display font-bold text-sm leading-none">Электронный журнал</div>
                <div className="text-purple-200 text-xs">преподавателя</div>
              </div>
            </div>

            {/* Group selector */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  className="appearance-none bg-white/20 backdrop-blur border border-white/30 text-white rounded-xl pl-3 pr-8 py-2 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
                  value={data.activeGroupId}
                  onChange={e => setData(d => ({ ...d, activeGroupId: e.target.value }))}
                  style={{ colorScheme: "dark" }}
                >
                  {data.groups.map(g => (
                    <option key={g.id} value={g.id} className="text-gray-900 bg-white">{g.name}</option>
                  ))}
                </select>
                <Icon name="ChevronDown" size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
              </div>
              <button
                className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors"
                onClick={() => setModal({ type: "addGroup" })}
                title="Создать группу"
              >
                <Icon name="Plus" size={14} className="text-white" />
              </button>
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="flex items-center gap-1.5 bg-white/15 border border-white/25 hover:bg-white/25 transition-colors text-white text-sm font-medium rounded-xl px-3 py-2"
                onClick={() => setModal({ type: "addStudent" })}
              >
                <Icon name="UserPlus" size={14} />
                <span className="hidden md:inline">+ Студент</span>
              </button>

              {/* Add lesson dropdown */}
              <div className="relative">
                <button
                  className="flex items-center gap-1.5 bg-white/15 border border-white/25 hover:bg-white/25 transition-colors text-white text-sm font-medium rounded-xl px-3 py-2"
                  onClick={() => setLessonDropdownOpen(v => !v)}
                >
                  <Icon name="CalendarPlus" size={14} />
                  <span className="hidden md:inline">Добавить пару</span>
                  <Icon name="ChevronDown" size={12} />
                </button>
                {lessonDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLessonDropdownOpen(false)} />
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50 min-w-[160px]">
                      {(["Лекция", "Практика", "Контрольная"] as LessonType[]).map(t => (
                        <button
                          key={t}
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-purple-50 transition-colors font-medium"
                          onClick={() => { addLesson(t); setLessonDropdownOpen(false); }}
                        >
                          {t === "Лекция" ? "📖" : t === "Практика" ? "⚙️" : "📝"} {t}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                className="flex items-center gap-1.5 text-white text-sm font-medium rounded-xl px-3 py-2 transition-all"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)", border: "1px solid rgba(16,185,129,0.4)" }}
                onClick={markAllPresent}
                title="Отметить всех присутствующими на последней паре"
              >
                <Icon name="CheckCheck" size={14} />
                <span className="hidden md:inline">Всем Б</span>
              </button>

              <button
                className="flex items-center gap-1.5 text-white text-sm font-bold rounded-xl px-3 py-2 transition-all pulse-glow"
                style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", border: "1px solid rgba(245,158,11,0.5)" }}
                onClick={callToBoard}
                title="Вызвать случайного студента"
              >
                🎯 <span className="hidden md:inline">Ко доске!</span>
              </button>

              <button
                className="flex items-center gap-1.5 bg-white/15 border border-white/25 hover:bg-white/25 transition-colors text-white text-sm font-medium rounded-xl px-3 py-2"
                onClick={() => setModal({ type: "analytics" })}
              >
                📈 <span className="hidden md:inline">Аналитика</span>
              </button>

              <button
                className="flex items-center gap-1.5 bg-white/15 border border-white/25 hover:bg-white/25 transition-colors text-white text-sm font-medium rounded-xl px-3 py-2"
                onClick={exportCSV}
                title="Экспорт в CSV (Excel)"
              >
                <Icon name="Download" size={14} />
                <span className="hidden md:inline">Excel</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Table ── */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {activeGroup.students.length === 0 && activeGroup.lessons.length === 0 ? (
          <div className="text-center py-24 animate-fade-in">
            <div className="text-7xl mb-5">📓</div>
            <div className="font-display font-bold text-3xl text-grad mb-3">Журнал пуст</div>
            <div className="text-muted-foreground mb-8 text-lg">Добавьте студентов и занятия, чтобы начать работу</div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button className="btn-primary text-base px-6 py-3" onClick={() => setModal({ type: "addStudent" })}>
                <Icon name="UserPlus" size={16} className="inline mr-2" />
                Добавить студентов
              </button>
              <button className="btn-ghost text-base px-6 py-3" onClick={() => addLesson("Лекция")}>
                <Icon name="CalendarPlus" size={16} className="inline mr-2" />
                Добавить пару
              </button>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl card-shadow overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-purple-100">
                    <th className="sticky left-0 z-20 bg-gradient-to-r from-purple-50 to-indigo-50 text-left px-4 py-3 text-sm font-semibold text-foreground border-r border-border min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <Icon name="Users" size={14} className="text-purple-500" />
                        Студент
                      </div>
                    </th>
                    {activeGroup.lessons.map(lesson => (
                      <th
                        key={lesson.id}
                        className="bg-gradient-to-b from-purple-50 to-white px-2 py-2 text-center min-w-[110px] border-r border-border last:border-r-0 cursor-pointer hover:bg-purple-100/60 transition-colors group"
                        onClick={() => setModal({ type: "lesson", lessonId: lesson.id })}
                        title={lesson.topic ? `Тема: ${lesson.topic}` : "Нажмите для добавления темы"}
                      >
                        <div className="text-xs font-bold text-purple-700">{lesson.date}</div>
                        <div className={`text-xs mt-0.5 font-semibold px-1.5 py-0.5 rounded-full inline-block ${
                          lesson.type === "Лекция" ? "bg-blue-100 text-blue-700"
                          : lesson.type === "Практика" ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                        }`}>
                          {lesson.type}
                        </div>
                        {lesson.topic && (
                          <div className="text-[10px] text-purple-500 mt-0.5 truncate max-w-[100px]" title={lesson.topic}>
                            {lesson.topic}
                          </div>
                        )}
                        <Icon name="Pencil" size={10} className="text-purple-300 mx-auto mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </th>
                    ))}
                    <th className="bg-gradient-to-b from-purple-50 to-white px-3 py-3 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap min-w-[80px]">
                      Ср. балл
                    </th>
                    <th className="bg-gradient-to-b from-purple-50 to-white px-3 py-3 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap min-w-[100px]">
                      Сессия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeGroup.students.map((student, idx) => {
                    const avg = calcAvgGrade(student);
                    const status = calcSessionStatus(student);
                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-border last:border-b-0 transition-colors hover:bg-purple-50/40 ${idx % 2 === 0 ? "bg-white/60" : "bg-slate-50/40"}`}
                      >
                        <td className="sticky left-0 z-10 px-4 py-2 border-r border-border" style={{ background: idx % 2 === 0 ? "rgba(255,255,255,0.97)" : "rgba(248,250,252,0.97)" }}>
                          <button
                            className="text-left font-medium text-sm text-foreground hover:text-purple-700 transition-colors block w-full truncate max-w-[200px]"
                            onClick={() => setModal({ type: "student", studentId: student.id })}
                            title={student.name}
                          >
                            {student.name}
                          </button>
                        </td>

                        {activeGroup.lessons.map(lesson => {
                          const rec = student.records[lesson.id] ?? { attendance: "" as AttendanceStatus, grade: "" as Grade };
                          return (
                            <td key={lesson.id} className="px-2 py-2 text-center border-r border-border last:border-r-0">
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  className={`w-9 h-7 rounded-lg text-xs font-bold transition-all hover:scale-110 active:scale-95 ${attendanceStyle(rec.attendance)}`}
                                  onClick={() => cycleAttendance(student.id, lesson.id)}
                                >
                                  {rec.attendance || "·"}
                                </button>
                                <select
                                  className="w-12 text-xs rounded-lg border border-border bg-white/80 text-center font-bold py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                                  value={rec.grade}
                                  onChange={e => setGrade(student.id, lesson.id, e.target.value as Grade)}
                                  style={{
                                    color: rec.grade === "5" ? "#10b981"
                                      : rec.grade === "4" ? "#3b82f6"
                                      : rec.grade === "3" ? "#f59e0b"
                                      : rec.grade === "2" ? "#ef4444"
                                      : "#94a3b8"
                                  }}
                                >
                                  <option value="">—</option>
                                  <option value="5">5</option>
                                  <option value="4">4</option>
                                  <option value="3">3</option>
                                  <option value="2">2</option>
                                </select>
                              </div>
                            </td>
                          );
                        })}

                        <td className="px-3 py-2 text-center">
                          <span className="font-display font-bold text-sm" style={{
                            color: avg >= 4.5 ? "#10b981"
                              : avg >= 3.5 ? "#3b82f6"
                              : avg >= 2.5 ? "#f59e0b"
                              : avg > 0 ? "#ef4444"
                              : "#94a3b8"
                          }}>
                            {avg > 0 ? avg.toFixed(1) : "—"}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            status === "Автомат" ? "status-auto"
                            : status === "Недопуск" ? "status-fail"
                            : "status-exam"
                          }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer legend */}
            <div className="px-4 py-3 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-t border-border flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span><b className="text-foreground">{activeGroup.students.length}</b> студентов</span>
              <span><b className="text-foreground">{activeGroup.lessons.length}</b> занятий</span>
              <span className="hidden sm:inline text-purple-400">↑ Нажмите на имя — карточка студента · Нажмите на дату — тема занятия</span>
              <div className="ml-auto flex items-center gap-3 flex-wrap">
                {[
                  { cls: "attendance-present", label: "Б — Был" },
                  { cls: "attendance-absent", label: "Н — Не был" },
                  { cls: "attendance-excuse", label: "У — Уважит." },
                ].map(({ cls, label }) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className={`w-6 h-5 rounded text-white text-xs font-bold flex items-center justify-center ${cls}`}>
                      {label[0]}
                    </span>
                    <span>{label.slice(4)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {modal?.type === "lesson" && openLesson && (
        <LessonModal
          lesson={openLesson}
          onSave={(topic, hw) => updateLesson(openLesson.id, topic, hw)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "student" && openStudent && (
        <StudentCard
          student={openStudent}
          group={activeGroup}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "analytics" && (
        <AnalyticsModal group={activeGroup} onClose={() => setModal(null)} />
      )}
      {modal?.type === "addStudent" && (
        <AddStudentModal onAdd={addStudents} onClose={() => setModal(null)} />
      )}
      {modal?.type === "addGroup" && (
        <AddGroupModal onAdd={addGroup} onClose={() => setModal(null)} />
      )}
    </div>
  );
}