import JSZip from 'jszip';
import { checkFormatCompatibility } from './services/formatChecker.js';

async function runFormatCheckerTest() {
  console.log('🧪 Starting Deterministic Format Compatibility Check Test...\n');

  // Test Case 1: DOCX file containing a Table (<w:tbl>) and Embedded Image (<w:drawing>)
  const zipWithTableAndImages = new JSZip();
  const documentXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:v="urn:schemas-microsoft-com:vml">
  <w:body>
    <w:p><w:r><w:t>John Doe Resume</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Work Experience</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Company Inc</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/></wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  zipWithTableAndImages.file('word/document.xml', documentXmlContent);
  zipWithTableAndImages.file('word/media/image1.png', Buffer.from('fake image data'));

  const docxBuffer = await zipWithTableAndImages.generateAsync({ type: 'nodebuffer' });

  const mockParsedJson = {
    contact: { name: 'John Doe', email: 'john@example.com' },
    workExperience: [{ company: 'Tech', position: 'Developer' }],
    education: [{ institution: 'University', degree: 'BS' }],
    skills: ['JavaScript', 'React'],
  };

  const results = await checkFormatCompatibility(
    docxBuffer,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mockParsedJson
  );

  console.log('--- Test Results for Resume with Table & Image ---');
  results.forEach((res) => {
    const icon = res.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${icon}] ${res.check}: ${res.message}`);
  });

  const tableCheck = results.find((r) => r.check === 'Table Structures Detection');
  const imageCheck = results.find((r) => r.check === 'Embedded Images & Graphics');
  const sectionsCheck = results.find((r) => r.check === 'Standard Resume Sections');

  if (tableCheck && !tableCheck.passed && imageCheck && !imageCheck.passed && sectionsCheck && sectionsCheck.passed) {
    console.log('\n🎉 SUCCESS: Table and Image detection correctly identified formatting flaws!');
  } else {
    console.error('\n❌ FAILURE: Detection rules did not flag expected flaws.');
    process.exit(1);
  }

  // Test Case 2: Missing standard sections
  const incompleteParsedJson = {
    contact: {},
    workExperience: [],
    education: [],
    skills: [],
  };

  const resultsMissingSections = await checkFormatCompatibility(
    docxBuffer,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    incompleteParsedJson
  );

  const missingCheck = resultsMissingSections.find((r) => r.check === 'Standard Resume Sections');
  if (missingCheck && !missingCheck.passed) {
    console.log('🎉 SUCCESS: Missing Sections check correctly flagged missing core sections!');
  } else {
    console.error('❌ FAILURE: Missing sections check failed to trigger.');
    process.exit(1);
  }
}

runFormatCheckerTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
