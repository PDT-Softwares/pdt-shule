const fs = require('fs')
const path = require('path')

const pages = [
  { file: 'src/pages/Teachers.jsx', handler: 'handleDelete', itemVar: 't', title: 'Delete teacher?', nameExpr: "confirmDelete?.profile?.full_name" },
  { file: 'src/pages/Classes.jsx', handler: 'handleDeleteClass', itemVar: 'id', title: 'Delete class?', nameExpr: null },
  { file: 'src/pages/Classes.jsx', handler: 'handleDeleteStream', itemVar: 'id', title: 'Delete stream?', nameExpr: null },
  { file: 'src/pages/Marks.jsx', handler: 'handleDeleteAssessment', itemVar: 'id', title: 'Delete assessment?', nameExpr: null },
]

for (const { file } of [...new Set(pages.map(p => p.file))]) {
  let src = fs.readFileSync(file, 'utf8')

  // 1. Add ConfirmModal import
  if (!src.includes('ConfirmModal')) {
    src = src.replace(/(import PageFooter from '\.\.\/components\/PageFooter')/,
      "$1\nimport ConfirmModal from '../components/ConfirmModal'")
  }

  // 2. Add confirmDelete state after busy state
  if (!src.includes('confirmDelete')) {
    src = src.replace(/(const \[busy, setBusy\] = useState\(false\))/,
      "$1\n  const [confirmDelete, setConfirmDelete] = useState(null)")
  }
}

console.log('Patched import + state. Please run the per-page commands manually.')
