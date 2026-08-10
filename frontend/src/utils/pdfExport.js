import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Esporta una scheda di allenamento in formato PDF
 * @param {Object} plan - La scheda da esportare
 */
export function exportPlanToPDF(plan) {
    try {
        console.log("Inizio export PDF per:", plan.name);

        if (!plan || !plan.exercises) {
            console.error("Scheda non valida o senza esercizi");
            alert("Errore: scheda non valida");
            return;
        }

        const doc = new jsPDF();

        // Colori HYPER Titanium
        const PRIMARY = [15, 23, 42];
        const TITANIUM = [203, 213, 225];
        const BLACK = [11, 14, 20];
        const LIGHT_GRAY = [148, 163, 184];

        // === HEADER ===
        doc.setFillColor(...BLACK);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text('HYPER', 105, 20, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TITANIUM);
        doc.text('GYM | SPORT | CONDITIONING', 105, 28, { align: 'center' });

        // === NOME SCHEDA ===
        doc.setTextColor(...BLACK);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(plan.name || 'Scheda Allenamento', 15, 55);

        // Descrizione
        if (plan.description) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...LIGHT_GRAY);
            doc.text(plan.description, 15, 63);
        }

        // Linea separatore
        doc.setDrawColor(...PRIMARY);
        doc.setLineWidth(1);
        doc.line(15, 68, 195, 68);

        // === TABELLA ESERCIZI ===
        const tableData = plan.exercises.map((ex, index) => [
            (index + 1).toString(),
            ex.name || 'Esercizio',
            `${ex.sets || '-'}`,
            `${ex.reps || '-'}`,
            ex.note || '-'
        ]);

        const options = {
            head: [['#', 'Esercizio', 'Serie', 'Reps', 'Note']],
            body: tableData,
            startY: 75,
            theme: 'grid',
            headStyles: {
                fillColor: PRIMARY,
                textColor: BLACK,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                textColor: [60, 60, 60]
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: 15, right: 15 }
        };

        if (typeof autoTable === 'function') {
            autoTable(doc, options);
        } else if (typeof doc.autoTable === 'function') {
            doc.autoTable(options);
        } else {
            console.error("AutoTable non caricato:", autoTable);
            alert("Errore PDF: Ricarica la pagina");
            return;
        }

        console.log("Tabella generata");

        // === FOOTER ===
        const pageCount = doc.internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.height;

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            doc.setFontSize(8);
            doc.setTextColor(...LIGHT_GRAY);
            doc.setFont('helvetica', 'normal');

            const dateStr = new Date().toLocaleDateString('it-IT');
            doc.text(`Generato il ${dateStr}`, 15, pageHeight - 10);
            doc.text(`Pagina ${i} di ${pageCount}`, 195, pageHeight - 10, { align: 'right' });
            doc.text('HyperGym Workout Tracker', 105, pageHeight - 10, { align: 'center' });
        }

        // === SALVA ===
        const fileName = `${(plan.name || 'Scheda').replace(/[^a-z0-9]/gi, '_')}_HYPER.pdf`;
        doc.save(fileName);
        console.log("Salvataggio completato:", fileName);

    } catch (error) {
        console.error("Errore esportazione PDF:", error);
        alert(`Errore PDF: ${error.message}`);
    }
}

/**
 * Esporta lo storico allenamenti in PDF
 */
export function exportHistoryToPDF(history, userName = 'Utente') {
    try {
        if (!history || history.length === 0) {
            alert("Nessun allenamento da esportare");
            return;
        }

        const doc = new jsPDF();
        const PRIMARY = [163, 230, 53];
        const BLACK = [0, 0, 0];

        doc.setFillColor(...BLACK);
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('STORICO ALLENAMENTI', 105, 22, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(...BLACK);
        doc.text(`Atleta: ${userName}`, 15, 50);

        const tableData = history.slice(0, 100).map((session, index) => [
            (index + 1).toString(),
            new Date(session.startedAt || session.date).toLocaleDateString('it-IT'),
            session.name || session.planName || 'Allenamento',
            (session.exercises?.length || 0).toString(),
            `${Math.round(session.duration || 0)} min`
        ]);

        const options = {
            head: [['#', 'Data', 'Nome', 'Ex', 'Durata']],
            body: tableData,
            startY: 60,
            theme: 'grid',
            headStyles: {
                fillColor: PRIMARY,
                textColor: BLACK,
                fontStyle: 'bold'
            }
        };

        if (typeof autoTable === 'function') {
            autoTable(doc, options);
        } else if (typeof doc.autoTable === 'function') {
            doc.autoTable(options);
        } else {
            console.error("AutoTable non trovato. Import:", autoTable, "Doc.proto:", doc.autoTable);
            alert("Errore: Plugin PDF non caricato. Ricarica la pagina.");
            return;
        }

        doc.save(`Storico_${userName}_HYPER.pdf`);
    } catch (error) {
        console.error("Errore esportazione Storico PDF:", error);
        alert("Impossibile esportare storico");
    }
}
