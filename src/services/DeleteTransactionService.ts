import { getRepository } from 'typeorm';

import Transiction from '../models/Transaction';
import AppError from '../errors/AppError';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getRepository(Transiction);
    const transaction = await transactionRepository.findOne(id);
    if (!transaction) {
      throw new AppError('Transação não existe.');
    }
    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
