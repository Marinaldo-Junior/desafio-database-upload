import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getRepository(Category);
    const contactReadStream = fs.createReadStream(filePath);
    const parsers = csvParse({
      from_line: 2,
    });

    const parserCsv = contactReadStream.pipe(parsers);
    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parserCsv.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parserCsv.on('end', resolve));

    const categoriesExixtents = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const categoriesExixtentsTitles = categoriesExixtents.map(
      (category: Category) => category.title,
    );
    const addCategoryTitle = categories
      .filter(category => !categoriesExixtentsTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitle.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);
    const finalCategories = [...newCategories, ...categoriesExixtents];
    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);
    await fs.promises.unlink(filePath);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
